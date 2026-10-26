import random, shutil, sys
from pathlib import Path

SRC = Path(sys.argv[1])            # the Test folder from Step 1
OUT = Path("negatives")
PER_CLASS = 20
EXCLUDE = ["almond", "caju", "chestnut", "cocos", "hazelnut", "nut", "pecan", "pistachio",
           "walnut", "mushroom", "champignon", "corn", "ginger", "garlic", "tomato"]

random.seed(42)
if OUT.exists():
    shutil.rmtree(OUT)

kept, skipped, total = [], [], 0
for cls in sorted(p for p in SRC.iterdir() if p.is_dir()):
    if any(k in cls.name.lower() for k in EXCLUDE):
        skipped.append(cls.name)
        continue
    files = [f for f in cls.iterdir() if f.suffix.lower() in (".jpg", ".jpeg", ".png")]
    pick = random.sample(files, min(PER_CLASS, len(files)))
    (OUT / cls.name).mkdir(parents=True)
    for f in pick:
        shutil.copy(f, OUT / cls.name / f.name)
    kept.append(cls.name)
    total += len(pick)

print(f"kept {len(kept)} classes, {total} images -> {OUT.resolve()}")
print("skipped:", skipped)