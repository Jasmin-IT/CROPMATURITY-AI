import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import numpy as np
from PIL import Image
from app.verifier import TomatoVerifier
from app import config as C

ver = TomatoVerifier()
rows, allp = [], []
for d in sorted(Path("negatives").iterdir()):
    imgs = [Image.open(f).convert("RGB") for f in sorted(d.iterdir())]
    p = np.array(ver.tomato_prob(imgs))
    allp += p.tolist()
    rows.append((d.name, len(p), float(p.mean()), float((p >= C.VERIFY_MIN).mean())))

rows.sort(key=lambda r: -r[3])
print(f"\nWorst classes at VERIFY_MIN = {C.VERIFY_MIN} (share wrongly accepted as tomato)")
for name, n, mean, acc in rows[:15]:
    print(f"  {name:35s} n={n:3d}  mean={mean:.2f}  accepted={acc:.0%}")

a = np.array(allp)
print(f"\nOverall: {len(a)} non-tomato images")
for t in (0.1,0.15,0.2,0.25,0.3,0.4):
    print(f"  wrongly accepted at threshold {t}: {(a >= t).mean():.1%}")