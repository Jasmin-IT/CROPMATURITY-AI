import base64
from contextlib import asynccontextmanager
from pathlib import Path
from pydantic import BaseModel
from . import config as C, db, llm, rag
import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from .analyzer import TomatoAnalyzer, InvalidImageError, load_image
from .live import LiveAnalyzer, summarize_counts

state = {}


@asynccontextmanager
async def lifespan(app):
    db.init()
    state["analyzer"] = TomatoAnalyzer()
    state["live_analyzer"] = LiveAnalyzer(state["analyzer"], imgsz=640, verify_every=10, masks=False)
    state["live_imgsz"] = 640
    state["live_masks"] = False
    yield


app = FastAPI(title="Crop Maturity & Harvest Readiness API", lifespan=lifespan)

# Allow Cross-Origin Requests from React development and production servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": "analyzer" in state,
        "classes": C.CLASSES,
        "ready_weights": C.READY_WEIGHTS,
        "conf": C.CONF,
        "detector": "YOLOv8m-seg",
        "verifier": "CLIP zero-shot",
        "knowledge_base": "RAG, ChromaDB",
        "llm_model": llm.MODEL,
        "backup_model": llm.BACKUP_MODEL,
        "status_bands": C.STATUS_BANDS,
    }


@app.post("/predict")
def predict(file: UploadFile = File(...), annotate: bool = True, save: bool = True):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in C.ALLOWED_EXT:
        raise HTTPException(415, f"Unsupported format '{ext}'. Allowed: {sorted(C.ALLOWED_EXT)}")
    limit = C.MAX_UPLOAD_MB * 1024 * 1024
    data = file.file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(413, f"File larger than {C.MAX_UPLOAD_MB} MB.")
    try:
        summary, annotated = state["analyzer"].analyze(data, annotate=annotate)
    except InvalidImageError as e:
        raise HTTPException(400, str(e))
    
    det_id = None
    if save and summary["total"] > 0:
        det_id = db.save_detection(file.filename or "uploaded_image.jpg", summary)
    summary["id"] = det_id

    if annotate and annotated is not None:
        _, buf = cv2.imencode(".jpg", annotated)
        summary["annotated_jpg_base64"] = base64.b64encode(buf).decode()
    return summary


@app.post("/live/frame")
def live_frame(file: UploadFile = File(...), masks: bool = False, imgsz: int = 640):
    data = file.file.read()
    try:
        img = load_image(data)
    except Exception as e:
        raise HTTPException(400, f"Invalid frame: {e}")

    if "live_analyzer" not in state or state.get("live_imgsz") != imgsz or state.get("live_masks") != masks:
        state["live_analyzer"] = LiveAnalyzer(state["analyzer"], imgsz=imgsz, verify_every=10, masks=masks)
        state["live_imgsz"] = imgsz
        state["live_masks"] = masks

    out = state["live_analyzer"].process(img)
    s = summarize_counts(out["smooth"], out["scene_ok"])
    s["inference_ms"] = round(out["ms"], 1)
    _, buf = cv2.imencode(".jpg", out["annotated"])
    s["annotated_jpg_base64"] = base64.b64encode(buf).decode()
    return s


@app.post("/live/save-snapshot")
def save_live_snapshot(payload: dict):
    if payload.get("total", 0) > 0:
        det_id = db.save_detection("live camera", payload)
        return {"status": "saved", "id": det_id}
    raise HTTPException(400, "Cannot save snapshot with 0 tomatoes.")


@app.get("/samples")
def get_samples():
    test_dir = C.ROOT / "test_cases"
    samples = []
    if test_dir.exists():
        for category in ["clear", "crowded", "real_world", "lowlight", "occluded", "nontomato"]:
            folder = test_dir / category
            if folder.exists():
                for f in sorted(folder.glob("*.[jJ][pP][gG]")):
                    samples.append({
                        "name": f.name,
                        "category": category,
                        "rel_path": f"{category}/{f.name}",
                        "url": f"/samples/{category}/{f.name}"
                    })
    return samples


@app.get("/samples/{category}/{filename}")
def get_sample_file(category: str, filename: str):
    p = C.ROOT / "test_cases" / category / filename
    if not p.exists() or not p.is_file():
        raise HTTPException(404, "Sample image not found")
    return FileResponse(p)


@app.get("/crop-statistics")
def crop_statistics():
    r = db.latest()
    if not r:
        raise HTTPException(404, "No analyses yet.")
    return r


@app.get("/harvest-readiness")
def harvest_readiness():
    r = db.latest()
    if not r:
        raise HTTPException(404, "No analyses yet.")
    return {"readiness": r["readiness"], "readiness_spec": r["readiness_spec"], "created_at": r["created_at"]}


@app.get("/history")
def history(limit: int = 100):
    return db.history(min(limit, 500))


@app.delete("/history/{detection_id}")
def delete_history_item(detection_id: int):
    db.delete_detection(detection_id)
    return {"status": "ok", "deleted_id": detection_id}


@app.delete("/history")
def clear_history():
    db.clear_history()
    return {"status": "ok", "message": "All history cleared"}


class ChatIn(BaseModel):
    question: str
    detection_id: int | None = None
    history: list[dict] = []


def _context(detection_id):
    row = db.get(detection_id) if detection_id else db.latest()
    if not row:
        raise HTTPException(404, "No analyses yet. Upload an image to /predict first.")
    prev = db.previous(row["id"])
    return row, llm.summary_from_row(row), prev


@app.post("/ai/analyze")
def ai_analyze(detection_id: int | None = None):
    row, s, prev = _context(detection_id)
    out = llm.analyze(s, prev)
    db.save_analysis(row["id"], out["analysis"], out["recommendation"])
    return {"detection_id": row["id"], **out}


@app.post("/ai/report")
def ai_report(detection_id: int | None = None):
    row, s, prev = _context(detection_id)
    return {"detection_id": row["id"], **llm.daily_report(s, prev)}


@app.post("/ai/chat")
def ai_chat(body: ChatIn):
    row, s, prev = _context(body.detection_id)
    passages = rag.search(body.question)
    out = llm.chat(body.question, s, prev, body.history, passages)
    return {
        "detection_id": row["id"],
        "knowledge_sources": sorted({p["source"] for p in passages}),
        **out
    }


@app.get("/rag/search")
def rag_search(q: str, k: int = 4):
    return rag.search(q, min(k, 10))


@app.post("/rag/reindex")
def rag_reindex():
    return {"chunks": rag.build_index()}