import time
from collections import deque

import cv2
import numpy as np
from PIL import Image

from . import config as C
from .analyzer import harvest_status

SMOOTH = 9          # frames used for the median that stabilises the counts
MATCH_IOU = 0.3     # overlap needed to treat a box as the same object as in the previous frame


def summarize_counts(counts, scene_ok=True):
    total = sum(counts.values())
    pct = {c: round(100 * n / total, 1) if total else 0.0 for c, n in counts.items()}
    readiness = round(sum(C.READY_WEIGHTS[c] * pct[c] for c in C.CLASSES), 1)
    if total:
        status = harvest_status(readiness)
    elif not scene_ok:
        status = "No tomatoes found: the detected objects do not look like tomatoes."
    else:
        status = "No tomatoes in view"
    return {"total": total, "counts": dict(counts), "percentages": pct, "readiness": readiness,
            "readiness_spec": pct[C.MATURE_CLASS], "status": status, "avg_confidence": None, "warnings": []}


def _iou(a, b):
    x1, y1 = max(a[0], b[0]), max(a[1], b[1])
    x2, y2 = min(a[2], b[2]), min(a[3], b[3])
    inter = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    union = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / max(union, 1e-9)


def _crop_boxes(frame, boxes):
    h, w = frame.shape[:2]
    out = []
    for x1, y1, x2, y2 in boxes:
        mx, my = (x2 - x1) * 0.1, (y2 - y1) * 0.1
        a, b = int(max(0, x1 - mx)), int(max(0, y1 - my))
        c, d = int(min(w, x2 + mx)), int(min(h, y2 + my))
        c, d = max(c, a + 2), max(d, b + 2)
        out.append(Image.fromarray(cv2.cvtColor(frame[b:d, a:c], cv2.COLOR_BGR2RGB)))
    return out


class LiveAnalyzer:
    """verify_every: 0 = tomato check off; N = also re-check every box every N frames.
    New objects are always checked immediately, before they are drawn or counted."""

    def __init__(self, analyzer, imgsz=640, verify_every=10, masks=False):
        self.an, self.imgsz, self.verify_every, self.masks = analyzer, imgsz, verify_every, masks
        self.hist = deque(maxlen=SMOOTH)
        self.ms = deque(maxlen=30)
        self.frame_no = 0
        self.tracks = []          # (box, tomato_probability) from the previous frame

    def _verdicts(self, frame, boxes):
        n = len(boxes)
        if self.verify_every == 0 or self.an.verifier is None:
            return [1.0] * n
        refresh = self.frame_no % self.verify_every == 0
        old = [] if refresh else self.tracks
        probs = [None] * n
        for i, b in enumerate(boxes):
            best, best_p = 0.0, None
            for tb, tp in old:
                o = _iou(b, tb)
                if o > best:
                    best, best_p = o, tp
            if best >= MATCH_IOU:
                probs[i] = best_p
        need = [i for i, p in enumerate(probs) if p is None]
        if need:
            for i, p in zip(need, self.an.verifier.tomato_prob(_crop_boxes(frame, boxes[need]))):
                probs[i] = p
        return probs

    def process(self, frame):
        t0 = time.perf_counter()
        res = self.an.model.predict(frame, imgsz=self.imgsz, conf=C.CONF, max_det=C.MAX_DET,
                                    agnostic_nms=True, verbose=False)[0]
        n = 0 if res.boxes is None else len(res.boxes)
        scene_ok = True

        if n == 0:
            self.tracks = []
            res = None
        else:
            boxes = res.boxes.xyxy.cpu().numpy()
            probs = self._verdicts(frame, boxes)
            self.tracks = list(zip(boxes, probs))
            if n >= C.SCENE_MIN_BOXES and float(np.median(probs)) < C.SCENE_MIN:
                keep = []
            else:
                thr = C.VERIFY_MIN if n >= C.SCENE_MIN_BOXES else getattr(C, "VERIFY_MIN_FEW", C.VERIFY_MIN)
                keep = [i for i, p in enumerate(probs) if p >= thr]
            scene_ok = len(keep) > 0
            res = res[keep] if keep else None
        self.frame_no += 1

        counts = {c: 0 for c in C.CLASSES}
        if res is not None and res.boxes is not None and len(res.boxes):
            for cid in res.boxes.cls.int().tolist():
                counts[self.an.model.names[cid]] += 1
        self.hist.append([counts[c] for c in C.CLASSES])
        med = np.median(np.array(self.hist), axis=0)
        smooth = {c: int(round(v)) for c, v in zip(C.CLASSES, med)}

        annotated = res.plot(masks=self.masks) if res is not None else frame.copy()
        ms = (time.perf_counter() - t0) * 1000
        self.ms.append(ms)
        return {"annotated": annotated, "counts": counts, "smooth": smooth, "ms": ms, "scene_ok": scene_ok}