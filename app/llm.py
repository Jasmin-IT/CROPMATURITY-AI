import os, re, time
from dotenv import load_dotenv
from . import config as C
from .analyzer import harvest_status

load_dotenv(C.ROOT / ".env")
MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
FALLBACK_MODEL = os.getenv("GEMINI_FALLBACK_MODEL", "")
BACKUP_KEY = os.getenv("BACKUP_API_KEY", "")
BACKUP_URL = os.getenv("BACKUP_BASE_URL", "https://api.groq.com/openai/v1")
BACKUP_MODEL = os.getenv("BACKUP_MODEL", "")
_client = None
_last_provider = "gemini"

SYSTEM = """You are an agricultural assistant inside a tomato monitoring system.
Rules:
- Use ONLY the numbers in the DETECTION RESULTS block. Never invent, estimate or change counts, percentages or readiness values.
- The vision model has 3 stages: unripe (immature), semiripe (developing), ripe (mature). It does not detect an over-mature stage, so never claim any over-mature count.
- Do not predict a harvest date or window. You may say whether the field looks ready, approaching readiness or not ready, and what to keep monitoring.
- If warnings are listed, mention them briefly and say the result may be less reliable.
- If a question cannot be answered from the results, say what information is missing.
- If KNOWLEDGE BASE EXCERPTS are provided, use them for general agricultural facts and name the source in brackets, for example [harvest_indicators]. Never present excerpt facts as detection results.
- Plain language, short paragraphs, no markdown headings."""


# ---------- facts ----------
def summary_from_row(r):
    """DB row -> the same shape the analyzer returns."""
    total = r["total"]
    pct = {c: round(100 * r["counts"][c] / total, 1) if total else 0.0 for c in C.CLASSES}
    return {"total": total, "counts": r["counts"], "percentages": pct,
            "readiness": r["readiness"], "readiness_spec": r["readiness_spec"],
            "status": harvest_status(r["readiness"]) if total else "No tomatoes detected",
            "avg_confidence": r.get("avg_confidence"), "warnings": [], "created_at": r.get("created_at")}


def facts_block(s, prev=None):
    L = ["DETECTION RESULTS (from the computer-vision model):",
         f"- total tomatoes detected: {s['total']}"]
    for c in C.CLASSES:
        L.append(f"- {c}: {s['counts'][c]} ({s['percentages'][c]}%)")
    L += [f"- harvest readiness (weighted, ripe + 0.5 x semiripe): {s['readiness']}%",
          f"- ripe share only: {s['readiness_spec']}%",
          f"- status: {s['status']}"]
    if s.get("avg_confidence") is not None:
        L.append(f"- average detection confidence: {round(s['avg_confidence'] * 100)}%")
    if s.get("warnings"):
        L.append("- warnings: " + " | ".join(s["warnings"]))
    if prev:
        L += ["PREVIOUS MONITORING SESSION:", f"- total: {prev['total']}",
              f"- harvest readiness: {prev['readiness']}%", f"- ripe share: {prev['readiness_spec']}%"]
    return "\n".join(L)


# ---------- number guard ----------
def _allowed(s, prev):
    v = {s["total"], s["readiness"], s["readiness_spec"]}
    v |= set(s["counts"].values()) | set(s["percentages"].values())
    if s.get("avg_confidence") is not None:
        v.add(s["avg_confidence"] * 100)
    if prev:
        v |= {prev["total"], prev["readiness"], prev["readiness_spec"]} | set(prev["counts"].values())
        v |= {abs(s["readiness"] - prev["readiness"]), abs(s["readiness_spec"] - prev["readiness_spec"]),
              abs(s["total"] - prev["total"])}
    v |= {0, 100} | {t for t, _ in C.STATUS_BANDS}
    return v


def bad_numbers(text, s, prev=None, ctx=""):
    allowed = _allowed(s, prev) | {float(x) for x in re.findall(r"\d+(?:\.\d+)?", ctx)}
    bad = []
    for m in re.finditer(r"(\d+(?:\.\d+)?)\s*(%|percent|points?|tomatoes|crops|fruits|detections)", text, re.I):
        x = float(m.group(1))
        if not any(abs(x - a) <= 0.51 for a in allowed):
            bad.append(m.group(0))
    return bad


# ---------- LLM calls ----------
def _call(prompt):
    """Gemini, with retries on busy errors and an optional second Gemini model."""
    global _client
    from google import genai
    from google.genai import types
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not set")
    if _client is None:
        _client = genai.Client(api_key=key)
    base = dict(system_instruction=SYSTEM, temperature=0.3, max_output_tokens=700)

    def once(model):
        try:   # ask the model not to spend time "thinking"
            cfg = types.GenerateContentConfig(**base, thinking_config=types.ThinkingConfig(thinking_budget=0))
            return _client.models.generate_content(model=model, contents=prompt, config=cfg)
        except Exception as e:
            if "thinking" not in str(e).lower():
                raise
            return _client.models.generate_content(model=model, contents=prompt,
                                                   config=types.GenerateContentConfig(**base))

    last = None
    for model in [m for m in (MODEL, FALLBACK_MODEL) if m]:
        for attempt in range(3):
            try:
                text = (once(model).text or "").strip()
                if text:
                    return text
                raise RuntimeError("empty response from model")
            except Exception as e:
                last = e
                busy = any(t in str(e) for t in ("503", "429", "UNAVAILABLE", "RESOURCE_EXHAUSTED"))
                if busy and attempt < 2:
                    time.sleep(2 * (attempt + 1))     # wait 2s, then 4s
                    continue
                break                                  # not busy, or retries used up: next model
    if last is None:
        raise RuntimeError("No model configured or available")
    raise last


def _call_backup(prompt):
    from openai import OpenAI
    c = OpenAI(api_key=BACKUP_KEY, base_url=BACKUP_URL, timeout=30)
    msgs = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": prompt}]
    try:   # keep the model's thinking short so it answers fast and within the token limit
        r = c.chat.completions.create(model=BACKUP_MODEL, temperature=0.3, max_tokens=1500,
                                      messages=msgs, extra_body={"reasoning_effort": "low"})
    except Exception as e:
        if "reasoning" not in str(e).lower():
            raise
        r = c.chat.completions.create(model=BACKUP_MODEL, temperature=0.3, max_tokens=1500, messages=msgs)
    text = (r.choices[0].message.content or "").strip()
    if not text:
        raise RuntimeError("empty response from backup model")
    return text


def _call_any(prompt):
    """Gemini first, then the backup provider if it is configured."""
    global _last_provider
    try:
        text = _call(prompt)
        _last_provider = "gemini"
        return text
    except Exception as e:
        if not (BACKUP_KEY and BACKUP_MODEL):
            raise
        print(f"[llm] Gemini failed ({type(e).__name__}); trying backup {BACKUP_MODEL}")
        text = _call_backup(prompt)
        _last_provider = "backup"
        return text


def _generate(prompt, s, prev, fallback, ctx=""):
    t0, calls = time.perf_counter(), 0
    try:
        text = _call_any(prompt); calls = 1
        bad = bad_numbers(text, s, prev, ctx)
        if bad:
            text = _call_any(prompt + f"\n\nYour previous answer used numbers that are not in the results "
                                      f"({', '.join(bad)}). Rewrite it using only the given numbers.")
            calls = 2
            if bad_numbers(text, s, prev, ctx):
                print(f"[llm] numbers rejected after retry, {time.perf_counter() - t0:.1f}s")
                return fallback(), "template (LLM numbers did not match results)"
        label = "llm" if _last_provider == "gemini" else f"llm (backup: {BACKUP_MODEL})"
        print(f"[llm] {label}: {calls} call(s), {time.perf_counter() - t0:.1f}s")
        return text, label
    except Exception as e:
        print(f"[llm] failed after {time.perf_counter() - t0:.1f}s: {e}")
        return fallback(), f"template ({type(e).__name__}: {e})"[:160]


# ---------- rule-based fallbacks (also work offline) ----------
def _fb_analysis(s):
    if s["total"] == 0:
        return "No tomatoes were detected in this image, so no maturity analysis is possible."
    return (f"{s['total']} tomatoes were detected: {s['percentages']['ripe']}% ripe, "
            f"{s['percentages']['semiripe']}% semiripe and {s['percentages']['unripe']}% unripe. "
            f"Harvest readiness is {s['readiness']}% ({s['status']}).")


def _fb_recommendation(s):
    r = s["readiness"]
    if s["total"] == 0: return "Retake the photo so tomatoes are clearly visible."
    if r >= 85: return "Most fruit is ripe. Harvesting can be planned, prioritising the ripe tomatoes."
    if r >= 60: return "The field is approaching harvest stage. Keep monitoring and prepare for harvest."
    if r >= 30: return "Many tomatoes are still developing. Continue monitoring and check again in a few days."
    return "The field is not ready. Most tomatoes are unripe, so wait and monitor."


def _fb_chat(q, s, passages=None):
    ql = q.lower()
    if any(w in ql for w in ("over-mature", "overmature", "over mature", "overripe")):
        return ("This system detects three stages: unripe, semiripe and ripe. It does not detect an "
                "over-mature stage, so I cannot give a count for it.")
    if any(w in ql for w in ("when", "date", "which day", "how many days")):
        return "I cannot predict a harvest date. " + _fb_analysis(s) + " " + _fb_recommendation(s)
    if passages:
        p = passages[0]
        return (f"The AI assistant is temporarily unavailable. The closest reference note is [{p['source']}]: "
                f"{p['text'][:350]}")
    return ("The AI assistant is temporarily unavailable, and the knowledge base has no information on this "
            "question. Current field status: " + _fb_analysis(s))


# ---------- public functions ----------
def analyze(s, prev=None):
    prompt = (facts_block(s, prev) + "\n\nWrite (1) a 3 to 4 sentence analysis of the maturity distribution, "
              "then (2) a new line starting with 'RECOMMENDATION:' followed by 2 to 3 sentences of harvest "
              "advice based only on these results.")
    text, source = _generate(prompt, s, prev, lambda: _fb_analysis(s) + "\nRECOMMENDATION: " + _fb_recommendation(s))
    analysis, _, rec = text.partition("RECOMMENDATION:")
    return {"analysis": analysis.strip(), "recommendation": rec.strip() or _fb_recommendation(s), "source": source}


def daily_report(s, prev=None):
    # numbers come from code, the LLM only writes the commentary
    head = ["Daily Crop Monitoring Report", f"Total tomatoes detected: {s['total']}"]
    head += [f"{c.capitalize()}: {s['counts'][c]} ({s['percentages'][c]}%)" for c in C.CLASSES]
    head.append(f"Harvest readiness: {s['readiness']}% ({s['status']})")
    if prev:
        d = round(s["readiness"] - prev["readiness"], 1)
        head.append(f"Change in readiness since the previous session: {d:+}")
    prompt = (facts_block(s, prev) + "\n\nWrite a short commentary (3 to 4 sentences) for a daily report. "
              "Say whether maturity has increased, decreased or stayed similar compared with the previous "
              "session (if one is given), and what to monitor next.")
    fb = lambda: (_fb_analysis(s) + " " + _fb_recommendation(s))
    text, source = _generate(prompt, s, prev, fb)
    return {"report": "\n".join(head) + "\n\n" + text, "source": source}


def chat(question, s, prev=None, history=None, passages=None):
    convo = "\n".join(f"{m.get('role', 'user')}: {m.get('content', '')}" for m in (history or [])[-6:])
    ctx = "\n\n".join(f"[{p['source']}] {p['text']}" for p in (passages or []))
    kb = ("\n\nKNOWLEDGE BASE EXCERPTS (general agricultural reference, not detection results):\n" + ctx) if ctx else ""
    prompt = (facts_block(s, prev) + kb + ("\n\nCONVERSATION SO FAR:\n" + convo if convo else "") +
              f"\n\nUSER QUESTION: {question}\n\nUse the detection results for facts about this field and the "
              "excerpts for general knowledge. If neither covers the question, say so. "
              "Keep the answer under 90 words.")
    text, source = _generate(prompt, s, prev, lambda: _fb_chat(question, s, passages), ctx)
    return {"answer": text, "source": source}