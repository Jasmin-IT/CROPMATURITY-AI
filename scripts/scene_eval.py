import glob, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import cv2, numpy as np
from PIL import Image
from app.verifier import TomatoVerifier

TH = (0.15, 0.2, 0.3, 0.4, 0.5)
ver = TomatoVerifier()

# 1) real tomato images: crops come from the test labels
meds = []
for p in sorted(glob.glob("dataset_3class/images/test/*.jpg"))[::3]:
    img = cv2.imread(p); h, w = img.shape[:2]
    crops = []
    for line in Path(p.replace("images", "labels")).with_suffix(".txt").read_text().splitlines():
        parts = line.split()
        if len(parts) < 7:
            continue
        xy = np.array(parts[1:], float).reshape(-1, 2) * [w, h]
        (x1, y1), (x2, y2) = xy.min(0), xy.max(0)
        mx, my = (x2 - x1) * .1, (y2 - y1) * .1
        a, b, c, d = int(max(0, x1 - mx)), int(max(0, y1 - my)), int(min(w, x2 + mx)), int(min(h, y2 + my))
        if c - a > 4 and d - b > 4:
            crops.append(Image.fromarray(cv2.cvtColor(img[b:d, a:c], cv2.COLOR_BGR2RGB)))
    if len(crops) >= 3:
        meds.append(float(np.median(ver.tomato_prob(crops))))
real = np.array(meds)

# 2) non-tomato "scenes": each fruit type in negatives/ counts as one scene
neg = []
for d in sorted(Path("negatives").iterdir()):
    imgs = [Image.open(f).convert("RGB") for f in sorted(d.iterdir())[:10]]
    neg.append(float(np.median(ver.tomato_prob(imgs))))
neg = np.array(neg)

print(f"\n{len(real)} real tomato images, {len(neg)} non-tomato fruit types")
print(f"{'SCENE_MIN':>10s} {'real tomato images passing':>28s} {'fruit types wrongly passing':>30s}")
for t in TH:
    print(f"{t:10.2f} {(real >= t).mean():28.0%} {(neg >= t).mean():30.0%}")