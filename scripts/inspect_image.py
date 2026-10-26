import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
from app import config as C
from app.analyzer import TomatoAnalyzer, load_image

an = TomatoAnalyzer()


def iou(a, b):
    x1, y1 = max(a[0], b[0]), max(a[1], b[1])
    x2, y2 = min(a[2], b[2]), min(a[3], b[3])
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    union = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / max(union, 1e-9)


for p in sys.argv[1:]:
    img = load_image(p)
    h, w = img.shape[:2]
    res = an.model.predict(img, imgsz=C.IMGSZ, conf=0.25, max_det=C.MAX_DET, verbose=False)[0]
    print(f"\n{Path(p).name} ({w}x{h})")
    if res.boxes is None or not len(res.boxes):
        print("  no detections")
        continue
    probs = an.verifier.tomato_prob(an._crops(res, img))
    boxes = res.boxes.xyxy.cpu().numpy()
    cls = res.boxes.cls.int().tolist()
    print(f"  {'#':>2} {'class':9} {'conf':>5} {'tomato_p':>9} {'area%':>6}  kept")
    for i, (b, c, cf, pr) in enumerate(zip(boxes, cls, res.boxes.conf.tolist(), probs)):
        area = (b[2] - b[0]) * (b[3] - b[1]) / (w * h) * 100
        kept = cf >= C.CONF and pr >= C.VERIFY_MIN
        print(f"  {i:2d} {an.model.names[c]:9} {cf:5.2f} {pr:9.2f} {area:6.1f}  {'yes' if kept else 'no'}")
    for i in range(len(boxes)):
        for j in range(i + 1, len(boxes)):
            o = iou(boxes[i], boxes[j])
            if o > 0.3:
                print(f"  overlap: #{i} ({an.model.names[cls[i]]}) and #{j} ({an.model.names[cls[j]]}) IoU {o:.2f}")