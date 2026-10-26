import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import cv2
from app import config as C
from app.analyzer import TomatoAnalyzer

an = TomatoAnalyzer()
ROOT, LBL = Path("test_cases"), Path("dataset_3class/labels/test")
print(f"{'category':10s} {'true':>6s} {'conf>=0.25':>11s} {'conf>=0.50':>11s} {'after check':>12s}")
for cat in ("clear", "crowded", "lowlight", "blurry"):
    t = a = b = k = 0
    for p in sorted((ROOT / cat).glob("*.jpg")):
        f = LBL / (p.stem + ".txt")
        t += len([l for l in f.read_text().splitlines() if l.strip()]) if f.exists() else 0
        img = cv2.imread(str(p))
        r = an.model.predict(img, imgsz=C.IMGSZ, conf=0.25, max_det=C.MAX_DET, agnostic_nms=True, verbose=False)[0]
        if r.boxes is None or not len(r.boxes):
            continue
        a += len(r.boxes)
        idx = [i for i, c in enumerate(r.boxes.conf.tolist()) if c >= C.CONF]
        b += len(idx)
        if idx:
            keep, _ = an._verify(r[idx], img)
            k += len(keep)
    print(f"{cat:10s} {t:6d} {a:11d} {b:11d} {k:12d}")