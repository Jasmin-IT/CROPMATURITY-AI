import json, random
from pathlib import Path
from collections import Counter
from PIL import Image, ImageOps

SRC = Path("LaboroTomato")
OUT = Path("dataset_3class")
MAX_SIDE = 1280
VAL_FRAC = 0.15
SEED = 42

CLASSES = ["unripe", "semiripe", "ripe"]   # COCO ids 1,2,3 -> YOLO ids 0,1,2
ID_MAP = {1: 3, 2: 2, 3: 1}                # fully->ripe, half->semiripe, green->unripe

random.seed(SEED)
Image.MAX_IMAGE_PIXELS = None


def load(subset, split):
    data = json.load(open(SRC / subset / "annotations" / f"{split}.json", encoding="utf-8"))
    by_img = {}
    for a in data["annotations"]:
        by_img.setdefault(a["image_id"], []).append(a)
    return [(subset, split, im, by_img.get(im["id"], [])) for im in data["images"]]


def process(items, split_name):
    img_dir = OUT / "images" / split_name
    lbl_dir = OUT / "labels" / split_name
    img_dir.mkdir(parents=True, exist_ok=True)
    lbl_dir.mkdir(parents=True, exist_ok=True)

    coco = {
        "images": [], "annotations": [],
        "categories": [{"id": i + 1, "name": n} for i, n in enumerate(CLASSES)],
    }
    counts, ann_id, skipped = Counter(), 1, 0

    for img_id, (subset, src_split, im, anns) in enumerate(items, start=1):
        src = SRC / subset / src_split / im["file_name"]
        new_name = f"{subset}_{im['file_name']}"
        with Image.open(src) as img:
            img = ImageOps.exif_transpose(img).convert("RGB")
            W, H = img.size
            if (W, H) != (im["width"], im["height"]):
                print(f"WARNING size mismatch {src.name}: file {(W, H)} vs json {(im['width'], im['height'])}")
            s = min(1.0, MAX_SIDE / max(W, H))
            nw, nh = round(W * s), round(H * s)
            img.resize((nw, nh), Image.LANCZOS).save(img_dir / new_name, quality=95)
        sx, sy = nw / W, nh / H

        coco["images"].append({"id": img_id, "file_name": new_name, "width": nw, "height": nh})
        yolo_lines = []

        for a in anns:
            segs = a.get("segmentation")
            if not isinstance(segs, list) or not segs:
                skipped += 1
                continue
            polys = []
            for p in segs:
                if len(p) >= 6:
                    polys.append([v * (sx if i % 2 == 0 else sy) for i, v in enumerate(p)])
            if not polys:
                skipped += 1
                continue
            x, y, w, h = a["bbox"]
            x, y, w, h = x * sx, y * sy, w * sx, h * sy
            if w < 2 or h < 2:
                skipped += 1
                continue

            cid = ID_MAP[a["category_id"]]
            coco["annotations"].append({
                "id": ann_id, "image_id": img_id, "category_id": cid,
                "bbox": [x, y, w, h], "area": a.get("area", w * h) * sx * sy,
                "segmentation": polys, "iscrowd": 0,
            })
            ann_id += 1
            counts[CLASSES[cid - 1]] += 1

            best = max(polys, key=len)  # YOLO line uses the largest polygon
            pts = " ".join(f"{best[i] / nw:.6f} {best[i + 1] / nh:.6f}" for i in range(0, len(best), 2))
            yolo_lines.append(f"{cid - 1} {pts}")

        (lbl_dir / (Path(new_name).stem + ".txt")).write_text("\n".join(yolo_lines))

    (OUT / "coco").mkdir(parents=True, exist_ok=True)
    json.dump(coco, open(OUT / "coco" / f"{split_name}.json", "w"))
    print(f"{split_name:5s} images={len(items):4d} annotations={sum(counts.values()):5d} "
          f"skipped={skipped} {dict(counts)}")


def main():
    train_items, val_items = [], []
    for subset in ["laboro_big", "laboro_little"]:
        items = load(subset, "train")
        random.shuffle(items)
        n_val = int(len(items) * VAL_FRAC)
        val_items += items[:n_val]
        train_items += items[n_val:]
    test_items = load("laboro_big", "test") + load("laboro_little", "test")

    process(train_items, "train")
    process(val_items, "val")
    process(test_items, "test")

    (OUT / "data.yaml").write_text(
        "path: /content/dataset_3class\n"
        "train: images/train\nval: images/val\ntest: images/test\n"
        "names:\n  0: unripe\n  1: semiripe\n  2: ripe\n"
    )
    print("done ->", OUT.resolve())


if __name__ == "__main__":
    main()