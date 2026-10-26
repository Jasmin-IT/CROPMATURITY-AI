import re
import chromadb
from . import config as C

KB_DIR = C.ROOT / "knowledge_base"
INDEX_DIR = C.ROOT / "data" / "chroma"
COLLECTION = "tomato_kb"
MAX_CHARS = 900
MAX_DIST = 0.75        # cosine distance cut-off; lower = stricter (tune with /rag/search)

_col = None


def _client():
    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=str(INDEX_DIR))


def chunk_file(path):
    text = path.read_text(encoding="utf-8")
    title = re.search(r"^#\s+(.+)$", text, re.M)
    title = title.group(1).strip() if title else path.stem
    src = re.search(r"^Source:\s*(.+)$", text, re.M)
    src = src.group(1).strip() if src else ""
    out = []
    for sec in re.split(r"\n(?=## )", text):
        lines = [l for l in sec.strip().splitlines() if not l.startswith("# ") and not l.startswith("Source:")]
        if not lines:
            continue
        heading = lines[0].lstrip("# ").strip() if lines[0].startswith("##") else ""
        body = [l for l in lines if not l.startswith("##")]
        buf = ""
        for para in "\n".join(body).split("\n"):
            if len(buf) + len(para) > MAX_CHARS and buf:
                out.append((title, heading, buf.strip(), src))
                buf = ""
            buf += para + " "
        if buf.strip():
            out.append((title, heading, buf.strip(), src))
    return out


def build_index():
    global _col
    cl = _client()
    try:
        cl.delete_collection(COLLECTION)
    except Exception:
        pass
    col = cl.create_collection(COLLECTION, metadata={"hnsw:space": "cosine"})
    docs, ids, metas = [], [], []
    for f in sorted(KB_DIR.glob("*.md")):
        for i, (title, heading, body, src) in enumerate(chunk_file(f)):
            docs.append(f"{title} - {heading}: {body}" if heading else f"{title}: {body}")
            ids.append(f"{f.stem}-{i}")
            metas.append({"source": f.stem, "heading": heading, "origin": src})
    if docs:
        col.add(documents=docs, ids=ids, metadatas=metas)
    _col = col
    return len(docs)


def _get():
    global _col
    if _col is None:
        try:
            _col = _client().get_collection(COLLECTION)
        except Exception:
            return None
    return _col


def search(query, k=4):
    """Returns relevant passages: [{source, heading, text, distance}]. Empty list if the index is missing."""
    col = _get()
    if col is None or not query.strip():
        return []
    r = col.query(query_texts=[query], n_results=k)
    out = []
    for doc, meta, dist in zip(r["documents"][0], r["metadatas"][0], r["distances"][0]):
        if dist <= MAX_DIST:
            out.append({"source": meta["source"], "heading": meta["heading"],
                        "text": doc, "distance": round(dist, 3)})
    return out


if __name__ == "__main__":
    n = build_index()
    print("indexed chunks:", n)
    for q in ["what does a breaker stage tomato look like", "why is my crop not turning red in hot weather"]:
        print("\nQ:", q)
        for p in search(q, 3):
            print(f"  [{p['source']}] d={p['distance']}  {p['text'][:90]}...")