import glob, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import cv2
import numpy as np
from app import config as C
from app.analyzer import TomatoAnalyzer

split = sys.argv[1] if len(sys.argv) > 1 else "val"
limit = int(sys.argv[2]) if len(sys.argv) > 2 else 60
THRESHOLDS = [round(float(t), 2) for t in np.arange(0.10, 0.81, 0.05)]

an = TomatoAnalyzer()
paths = sorted(glob.glob(f"dataset_3class/images/{split}/*.jpg"))
paths = paths[::max(1, len(paths) // limit)][:limit]


def gt_boxes(path, w, h):
    lbl = Path(path.replace("images", "labels")).with_suffix(".txt")
    out = []
    if lbl.exists():
        for line in lbl.read_text().splitlines():
            p = line.split()
            if len(p) < 7:
                continue
            xy = np.array(p[1:], float).reshape(-1, 2) * [w, h]
            out.append([*xy.min(0), *xy.max(0)])
    return np.array(out).reshape(-1, 4)


def iou(a, b):
    x1 = np.maximum(a[0], b[:, 0]); y1 = np.maximum(a[1], b[:, 1])
    x2 = np.minimum(a[2], b[:, 2]); y2 = np.minimum(a[3], b[:, 3])
    inter = np.clip(x2 - x1, 0, None) * np.clip(y2 - y1, 0, None)
    union = (a[2] - a[0]) * (a[3] - a[1]) + (b[:, 2] - b[:, 0]) * (b[:, 3] - b[:, 1]) - inter
    return inter / np.maximum(union, 1e-9)


# run the model once per image at a very low threshold
data = []
for i, p in enumerate(paths, 1):
    img = cv2.imread(p)
    h, w = img.shape[:2]
    res = an.model.predict(img, imgsz=C.IMGSZ, conf=0.05, max_det=C.MAX_DET, verbose=False)[0]
    n = 0 if res.boxes is None else len(res.boxes)
    if n:
        boxes, confs = res.boxes.xyxy.cpu().numpy(), res.boxes.conf.cpu().numpy()
        probs = np.array(an.verifier.tomato_prob(an._crops(res, img))) if an.verifier else np.ones(n)
    else:
        boxes, confs, probs = np.zeros((0, 4)), np.zeros(0), np.zeros(0)
    data.append((boxes, confs, probs, gt_boxes(p, w, h)))
    print(f"\rprocessing {i}/{len(paths)}", end="")
print()


def kept(confs, probs, t):
    """Same logic as the app: confidence threshold, then the tomato check."""
    idx = np.where(confs >= t)[0]
    if len(idx) == 0:
        return idx
    p = probs[idx]
    if len(idx) >= C.SCENE_MIN_BOXES and np.median(p) < C.SCENE_MIN:
        return idx[:0]
    thr = C.VERIFY_MIN if len(idx) >= C.SCENE_MIN_BOXES else getattr(C, "VERIFY_MIN_FEW", C.VERIFY_MIN)
    return idx[p >= thr]


rows = []
for t in THRESHOLDS:
    errs, tp, fp, fn, pred_total, gt_total = [], 0, 0, 0, 0, 0
    for boxes, confs, probs, gt in data:
        k = kept(confs, probs, t)
        pred_total += len(k); gt_total += len(gt)
        errs.append(abs(len(k) - len(gt)))
        used = set()
        order = k[np.argsort(-confs[k])] if len(k) else []
        for j in order:
            if len(gt):
                ov = iou(boxes[j], gt)
                if used:
                    ov[list(used)] = 0
                m = int(ov.argmax())
                if ov[m] >= 0.5:
                    tp += 1; used.add(m)
                    continue
            fp += 1
        fn += len(gt) - len(used)
    prec, rec = tp / max(tp + fp, 1), tp / max(tp + fn, 1)
    f1 = 2 * prec * rec / max(prec + rec, 1e-9)
    rows.append((t, pred_total, gt_total, float(np.mean(errs)), float(np.mean(np.array(errs) <= 1)), prec, rec, f1))

print(f"\nSplit: {split}, {len(data)} images, ground truth tomatoes: {rows[0][2]}")
print(f"{'conf':>5} {'predicted':>10} {'pred/true':>10} {'avg error':>10} {'within +-1':>11} {'precision':>10} {'recall':>8} {'F1':>6}")
for t, pt, gtt, mae, w1, pr, rc, f1 in rows:
    print(f"{t:5.2f} {pt:10d} {pt / max(gtt, 1):10.2f} {mae:10.2f} {w1:11.0%} {pr:10.2f} {rc:8.2f} {f1:6.2f}")

best_mae = min(rows, key=lambda r: r[3])
best_f1 = max(rows, key=lambda r: r[7])
print(f"\nLowest average count error: conf {best_mae[0]} (error {best_mae[3]:.2f} tomatoes per image)")
print(f"Best detection F1:          conf {best_f1[0]} (F1 {best_f1[7]:.2f})")