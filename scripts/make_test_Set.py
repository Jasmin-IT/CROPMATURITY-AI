import shutil, sys
from pathlib import Path
import cv2
import numpy as np

N = int(sys.argv[1]) if len(sys.argv) > 1 else 20
SRC, LBL, OUT = Path("dataset_3class/images/test"), Path("dataset_3class/labels/test"), Path("test_cases")
rng = np.random.default_rng(42)


def n_true(p):
    f = LBL / (p.stem + ".txt")
    return len([l for l in f.read_text().splitlines() if l.strip()]) if f.exists() else 0


allp = sorted(SRC.glob("*.jpg"))
picked = allp[::max(1, len(allp) // N)][:N]
crowded = [p for p in allp if n_true(p) >= 12][:N]

if OUT.exists():
    shutil.rmtree(OUT)
for d in ("clear", "crowded", "lowlight", "lowlight_severe", "blurry", "blurry_severe",
          "occluded", "nontomato", "real_world"):
    (OUT / d).mkdir(parents=True)

for p in crowded:
    shutil.copy(p, OUT / "crowded" / p.name)

for p in picked:
    img = cv2.imread(str(p))
    h, w = img.shape[:2]
    cv2.imwrite(str(OUT / "clear" / p.name), img)

    mod = np.clip(((img / 255.0) ** 1.3) * 255 * 0.6, 0, 255).astype(np.uint8)
    cv2.imwrite(str(OUT / "lowlight" / p.name), mod)
    dark = np.clip(((img / 255.0) ** 1.8) * 255 * 0.35, 0, 255).astype(np.uint8)
    cv2.imwrite(str(OUT / "lowlight_severe" / p.name), dark)
    cv2.imwrite(str(OUT / "blurry" / p.name), cv2.GaussianBlur(img, (0, 0), sigmaX=2.5))
    cv2.imwrite(str(OUT / "blurry_severe" / p.name), cv2.GaussianBlur(img, (0, 0), sigmaX=6))
    occ = img.copy()
    for _ in range(4):                       # leaf-green patches over random areas
        bw, bh = int(w * rng.uniform(.12, .22)), int(h * rng.uniform(.08, .16))
        x, y = int(rng.uniform(0, w - bw)), int(rng.uniform(0, h - bh))
        occ[y:y + bh, x:x + bw] = (34, 139, 34)
    cv2.imwrite(str(OUT / "occluded" / p.name), occ)

print(f"clear/lowlight/blurry/occluded: {len(picked)} images each, crowded: {len(crowded)}")
print("Now add your own photos:")
print("  test_cases/nontomato/   apple, orange, pepper, guava, hand, a face (anything that is NOT a tomato)")
print("  test_cases/real_world/  your own tomato photos, and a test_cases/expected.csv (file,true_count)")