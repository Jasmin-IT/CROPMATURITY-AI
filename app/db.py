import json, sqlite3
from contextlib import closing
from . import config as C

SCHEMA = """
CREATE TABLE IF NOT EXISTS detections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT,
    total INTEGER,
    counts_json TEXT,
    readiness REAL,
    readiness_spec REAL,
    avg_confidence REAL,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS ai_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    detection_id INTEGER REFERENCES detections(id),
    analysis TEXT,
    recommendation TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
"""


def _conn():
    c = sqlite3.connect(C.DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def init():
    C.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with closing(_conn()) as c:
        c.executescript(SCHEMA)
        c.commit()


def _row(r):
    d = dict(r)
    d["counts"] = json.loads(d.pop("counts_json"))
    return d


def save_detection(source, s):
    with closing(_conn()) as c:
        cur = c.execute(
            "INSERT INTO detections (source, total, counts_json, readiness, readiness_spec, avg_confidence) "
            "VALUES (?,?,?,?,?,?)",
            (source, s["total"], json.dumps(s["counts"]), s["readiness"],
             s["readiness_spec"], s["avg_confidence"]))
        c.commit()
        return cur.lastrowid


def latest():
    with closing(_conn()) as c:
        r = c.execute("SELECT * FROM detections ORDER BY id DESC LIMIT 1").fetchone()
        return _row(r) if r else None


def history(limit=50):
    with closing(_conn()) as c:
        rows = c.execute("SELECT * FROM detections ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        return [_row(r) for r in rows]

def get(det_id):
    with closing(_conn()) as c:
        r = c.execute("SELECT * FROM detections WHERE id=?", (det_id,)).fetchone()
        return _row(r) if r else None


def previous(det_id):
    with closing(_conn()) as c:
        r = c.execute("SELECT * FROM detections WHERE id<? ORDER BY id DESC LIMIT 1", (det_id,)).fetchone()
        return _row(r) if r else None


def save_analysis(det_id, analysis, recommendation):
    with closing(_conn()) as c:
        c.execute("INSERT INTO ai_analysis (detection_id, analysis, recommendation) VALUES (?,?,?)",
                  (det_id, analysis, recommendation))
        c.commit()


def delete_detection(det_id):
    with closing(_conn()) as c:
        c.execute("DELETE FROM ai_analysis WHERE detection_id=?", (det_id,))
        c.execute("DELETE FROM detections WHERE id=?", (det_id,))
        c.commit()


def clear_history():
    with closing(_conn()) as c:
        c.execute("DELETE FROM ai_analysis")
        c.execute("DELETE FROM detections")
        c.commit()