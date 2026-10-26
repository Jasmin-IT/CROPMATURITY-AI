import argparse, json, time
import cv2
import numpy as np
from ultralytics import YOLO
from . import config as C
from PIL import Image

class InvalidImageError(ValueError):
    pass


def load_image(source):
    """Path, raw bytes or BGR array -> validated BGR array. Raises InvalidImageError."""
    if isinstance(source, np.ndarray):
        img = source
    else:
        try:
            if isinstance(source, (bytes, bytearray)):
                data = np.frombuffer(source, np.uint8)
            else:
                data = np.fromfile(str(source), np.uint8)
        except OSError as e:
            raise InvalidImageError(f"Cannot read file: {e}")
        img = cv2.imdecode(data, cv2.IMREAD_COLOR) if data.size else None
    if img is None or img.ndim != 3 or img.size == 0:
        raise InvalidImageError("The file is not a valid image.")
    h, w = img.shape[:2]
    if min(h, w) < C.MIN_SIDE:
        raise InvalidImageError(f"Image is too small ({w}x{h}); minimum side is {C.MIN_SIDE}px.")
    return img


def quality_warnings(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    warnings = []
    if gray.mean() < C.DARK_MEAN:
        warnings.append("Image is very dark; detections may be unreliable.")
    small = cv2.resize(gray, (640, max(1, int(640 * gray.shape[0] / gray.shape[1]))))
    if cv2.Laplacian(small, cv2.CV_64F).var() < C.BLUR_VAR:
        warnings.append("Image looks blurry; try a sharper photo.")
    return warnings


def harvest_status(readiness):
    for threshold, label in C.STATUS_BANDS:
        if readiness >= threshold:
            return label


class TomatoAnalyzer:
    def __init__(self, weights=C.WEIGHTS, conf=C.CONF, imgsz=C.IMGSZ):
        self.model = YOLO(str(weights))
        self.conf, self.imgsz = conf, imgsz
        names = list(self.model.names.values())
        assert names == C.CLASSES, f"Model classes {names} do not match config {C.CLASSES}"
        self.verifier = None
        if C.VERIFY_TOMATO:
            from .verifier import TomatoVerifier
            self.verifier = TomatoVerifier()

    def _crops(self, res, img):
        h, w = img.shape[:2]
        crops = []
        for x1, y1, x2, y2 in res.boxes.xyxy.cpu().numpy():
            mx, my = (x2 - x1) * 0.1, (y2 - y1) * 0.1
            a, b = int(max(0, x1 - mx)), int(max(0, y1 - my))
            c, d = int(min(w, x2 + mx)), int(min(h, y2 + my))
            c, d = max(c, a + 2), max(d, b + 2)
            crops.append(Image.fromarray(cv2.cvtColor(img[b:d, a:c], cv2.COLOR_BGR2RGB)))
        return crops

    def _verify(self, res, img):
        """Returns (indices of detections to keep, number rejected)."""
        n = 0 if res.boxes is None else len(res.boxes)
        if n == 0 or self.verifier is None:
            return list(range(n)), 0
        probs = self.verifier.tomato_prob(self._crops(res, img))
        if n >= C.SCENE_MIN_BOXES and float(np.median(probs)) < C.SCENE_MIN:
            return [], n                     # most objects do not look like tomatoes: reject the image
        keep = [i for i, p in enumerate(probs) if p >= C.VERIFY_MIN]
        return keep, n - len(keep)

    def summarize(self, result, img, ms, rejected=0):
        counts = {c: 0 for c in C.CLASSES}
        confs = []
        if result is not None and result.boxes is not None and len(result.boxes):
            for cid, cf in zip(result.boxes.cls.int().tolist(), result.boxes.conf.tolist()):
                counts[self.model.names[cid]] += 1
                confs.append(cf)
        total = sum(counts.values())
        pct = {c: round(100 * n / total, 1) if total else 0.0 for c, n in counts.items()}
        readiness = round(sum(C.READY_WEIGHTS[c] * pct[c] for c in C.CLASSES), 1)

        warnings = quality_warnings(img)
        low = sum(1 for x in confs if x < C.LOW_CONF)

        if total:
            status = harvest_status(readiness)
            if low / total > 0.3:
                warnings.append(f"{low} of {total} detections have low confidence; treat the result with care.")
            if total >= C.MAX_DET:
                warnings.append(f"Detection limit ({C.MAX_DET}) reached; the real count may be higher.")
        elif rejected:
            status = "No tomatoes found: the detected objects do not look like tomatoes."
        else:
            status = "No tomatoes detected"
            warnings.append("No tomatoes detected. Check the image or lower the confidence threshold.")

        return {
            "total": total,
            "counts": counts,
            "percentages": pct,
            "readiness": readiness,
            "readiness_spec": pct[C.MATURE_CLASS],
            "status": status,
            "avg_confidence": round(float(np.mean(confs)), 3) if confs else None,
            "low_confidence_count": low,
            "rejected_non_tomato": rejected,
            "warnings": warnings,
            "inference_ms": round(ms, 1),
        }

    def analyze(self, source, annotate=False):
        """source: path, bytes or BGR frame. Returns (summary, annotated_frame_or_None)."""
        img = load_image(source)
        t0 = time.perf_counter()
        res = self.model.predict(img, imgsz=self.imgsz, conf=self.conf,
                                 max_det=C.MAX_DET, agnostic_nms=True, verbose=False)[0]
        n = 0 if res.boxes is None else len(res.boxes)
        keep, rejected = self._verify(res, img)
        ms = (time.perf_counter() - t0) * 1000
        if rejected and keep:
            res = res[keep]
        elif n and not keep:
            res = None
        summary = self.summarize(res, img, ms, rejected)
        annotated = None
        if annotate:
            annotated = res.plot() if res is not None else img.copy()
        return summary, annotated

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--out", help="save annotated image here")
    a = ap.parse_args()
    summary, annotated = TomatoAnalyzer().analyze(a.image, annotate=bool(a.out))
    print(json.dumps(summary, indent=2))
    if a.out:
        cv2.imwrite(a.out, annotated)