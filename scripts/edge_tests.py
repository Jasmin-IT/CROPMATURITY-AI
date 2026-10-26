import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import cv2, numpy as np
from app.analyzer import TomatoAnalyzer, InvalidImageError

def jpg(arr): return cv2.imencode(".jpg", arr)[1].tobytes()

cases = {
    "blank white 800x600": jpg(np.full((600, 800, 3), 255, np.uint8)),
    "very dark 800x600":   jpg(np.full((600, 800, 3), 10, np.uint8)),
    "random noise":        jpg(np.random.randint(0, 255, (600, 800, 3), dtype=np.uint8)),
    "tiny 20x20":          jpg(np.full((20, 20, 3), 128, np.uint8)),
    "text bytes (corrupt)": b"this is not an image",
    "empty file":          b"",
}

a = TomatoAnalyzer()
for name, data in cases.items():
    try:
        s, _ = a.analyze(data)
        print(f"{name:24s} OK       total={s['total']}  warnings={s['warnings']}")
    except InvalidImageError as e:
        print(f"{name:24s} REJECTED {e}")