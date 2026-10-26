import json
from pathlib import Path
from collections import Counter

root = Path("LaboroTomato")

for subset in ["laboro_big", "laboro_little"]:
    ann_dir = root / subset / "annotations"
    print(f"\n===== {subset} =====")
    print("files in annotations:", [p.name for p in ann_dir.glob("*")])

    for jf in sorted(ann_dir.glob("*.json")):
        data = json.load(open(jf, encoding="utf-8"))
        cats = {c["id"]: c["name"] for c in data["categories"]}
        counts = Counter(cats[a["category_id"]] for a in data["annotations"])
        has_seg = sum(1 for a in data["annotations"] if a.get("segmentation"))

        print(f"\n--- {jf.name} ---")
        print("images:", len(data["images"]), "| annotations:", len(data["annotations"]))
        print("categories:", cats)
        print("per-class counts:", dict(counts))
        print("annotations with segmentation:", has_seg)
        print("sample image entry:", data["images"][0])

    for split in ["train", "test"]:
        d = root / subset / split
        if d.exists():
            n = len(list(d.glob("*.jpg")) + list(d.glob("*.png")))
            print(f"{split} folder image files:", n)