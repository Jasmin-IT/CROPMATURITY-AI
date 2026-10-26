import json, random
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path("dataset_3class")
COLORS = {1: "yellow", 2: "orange", 3: "red"}   # unripe, semiripe, ripe
NAMES = {1: "unripe", 2: "semiripe", 3: "ripe"}

data = json.load(open(OUT / "coco" / "train.json"))
by_img = {}
for a in data["annotations"]:
    by_img.setdefault(a["image_id"], []).append(a)

(OUT / "overlay_check").mkdir(exist_ok=True)
for im in random.sample(data["images"], 4):
    img = Image.open(OUT / "images" / "train" / im["file_name"]).convert("RGB")
    d = ImageDraw.Draw(img)
    for a in by_img.get(im["id"], []):
        for poly in a["segmentation"]:
            pts = [(poly[i], poly[i + 1]) for i in range(0, len(poly), 2)]
            d.line(pts + [pts[0]], fill=COLORS[a["category_id"]], width=4)
    img.save(OUT / "overlay_check" / im["file_name"])
    print("saved", im["file_name"], img.size)