import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.analyzer import TomatoAnalyzer, load_image
from app import config as C

a = TomatoAnalyzer()
for p in sys.argv[1:]:
    img = load_image(p)
    res = a.model.predict(img, imgsz=C.IMGSZ, conf=C.CONF, max_det=C.MAX_DET, verbose=False)[0]
    if res.boxes is None or len(res.boxes) == 0:
        print(Path(p).name, ": no detections"); continue
    probs = a.verifier.tomato_prob(a._crops(res, img))
    print(f"\n{Path(p).name}: {len(probs)} detections")
    print("  tomato probabilities:", [round(x, 2) for x in probs])
    print("  kept at VERIFY_MIN =", C.VERIFY_MIN, ":", sum(x >= C.VERIFY_MIN for x in probs))