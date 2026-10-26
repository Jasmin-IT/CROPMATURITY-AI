import glob, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import cv2
import numpy as np
from app import config as C
from app.analyzer import TomatoAnalyzer

N = int(sys.argv[1]) if len(sys.argv) > 1 else 20
an = TomatoAnalyzer()
paths = sorted(glob.glob("dataset_3class/images/test/*.jpg"))
paths = paths[::max(1, len(paths) // N)][:N]
imgs = [cv2.imread(p) for p in paths]


def run(imgsz, verify):
    ms = []
    for im in imgs:
        t = time.perf_counter()
        res = an.model.predict(im, imgsz=imgsz, conf=C.CONF, max_det=C.MAX_DET, agnostic_nms=True, verbose=False)[0]
        if verify and an.verifier is not None and res.boxes is not None and len(res.boxes):
            an._verify(res, im)
        ms.append((time.perf_counter() - t) * 1000)
    return ms[2:]            # drop two warm-up runs


print(f"\n{len(imgs)} test images, conf {C.CONF}")
print(f"{'size':>5} {'tomato check':>13} {'mean ms':>9} {'p95 ms':>8} {'FPS':>6}")
for imgsz in (480, 640, 960, 1280):
    for verify in (False, True):
        t = run(imgsz, verify)
        print(f"{imgsz:5d} {('on' if verify else 'off'):>13} {np.mean(t):9.0f} {np.percentile(t, 95):8.0f} {1000 / np.mean(t):6.1f}")