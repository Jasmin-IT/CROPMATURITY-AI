import sys, glob
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import cv2, numpy as np
from PIL import Image
from app.verifier import TomatoVerifier
from app import config as C

N = int(sys.argv[1]) if len(sys.argv) > 1 else 40
ver = TomatoVerifier()
imgs = sorted(glob.glob("dataset_3class/images/test/*.jpg"))[::max(1, 162 // N)][:N]
probs = {c: [] for c in C.CLASSES}

for p in imgs:
    lbl = Path(p.replace("images", "labels")).with_suffix(".txt")
    img = cv2.imread(p)
    h, w = img.shape[:2]
    crops, cls = [], []
    for line in lbl.read_text().splitlines():
        parts = line.split()
        if len(parts) < 7:
            continue
        xy = np.array(parts[1:], float).reshape(-1, 2) * [w, h]
        x1, y1 = xy.min(0); x2, y2 = xy.max(0)
        mx, my = (x2 - x1) * 0.1, (y2 - y1) * 0.1
        a, b = int(max(0, x1 - mx)), int(max(0, y1 - my))
        c2, d = int(min(w, x2 + mx)), int(min(h, y2 + my))
        if c2 - a < 4 or d - b < 4:
            continue
        crops.append(Image.fromarray(cv2.cvtColor(img[b:d, a:c2], cv2.COLOR_BGR2RGB)))
        cls.append(C.CLASSES[int(parts[0])])
    if crops:
        for c, pr in zip(cls, ver.tomato_prob(crops)):
            probs[c].append(pr)

TH = (0.1, 0.15, 0.2, 0.25, 0.3, 0.4)
print(f"\nShare of REAL tomatoes kept ({len(imgs)} test images)")
print(f"{'class':10s} {'n':>5s} " + " ".join(f">={t:<6}" for t in TH))
for c in C.CLASSES:
    a = np.array(probs[c])
    if len(a):
        print(f"{c:10s} {len(a):5d} " + " ".join(f"{(a >= t).mean():8.0%}" for t in TH))
allp = np.concatenate([np.array(v) for v in probs.values() if v])
print(f"{'ALL':10s} {len(allp):5d} " + " ".join(f"{(allp >= t).mean():8.0%}" for t in TH))