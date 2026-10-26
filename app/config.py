from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEIGHTS = ROOT / "models" / "yolov8m_seg_best.pt"
DB_PATH = ROOT / "data" / "tomato.db"

# One place that defines the classes. For a 4th class later, change these
# and use the new weights; the rest of the app loops over them.
CLASSES = ["unripe", "semiripe", "ripe"]
MATURE_CLASS = "ripe"                      # used for the spec's formula: mature / total
READY_WEIGHTS = {"unripe": 0.0, "semiripe": 0.5, "ripe": 1.0}

STATUS_BANDS = [
    (85, "Ready to harvest"),
    (60, "Approaching harvest stage"),
    (30, "Still developing"),
    (0,  "Not ready"),
]

CONF = 0.50          # detection threshold
IMGSZ = 1280
MAX_DET = 300

# Input validation and quality checks (edge cases)
ALLOWED_EXT = {".jpg", ".jpeg", ".png"}
MAX_UPLOAD_MB = 15
MIN_SIDE = 64        # reject images smaller than this
LOW_CONF = 0.50      # detections below this count as "low confidence"
DARK_MEAN = 60       # mean brightness (0-255) below this -> dark warning
BLUR_VAR = 30        # Laplacian variance below this -> blur warning (tune on your own photos)


# Tomato verification (rejects apples, peppers, etc.)
VERIFY_TOMATO = True
CLIP_MODEL = "openai/clip-vit-base-patch32"
VERIFY_MIN = 0.15
SCENE_MIN = 0.3
SCENE_MIN_BOXES = 3      # minimum "this is a tomato" probability to keep a detection
TOMATO_PROMPTS = ["a photo of a tomato", "a photo of a green unripe tomato",
                  "a photo of a ripe red tomato", "a photo of a cherry tomato",
                  "a photo of a yellow tomato", "a photo of tomatoes growing on a plant"]

NOT_TOMATO = ["an apple", "a red apple", "a green apple", "an orange", "a tangerine", "a mandarin",
              "a grapefruit", "a pomelo", "a lemon", "a lime", "a peach", "a nectarine", "an apricot",
              "a mango", "a guava", "a pear", "a quince", "a persimmon", "a fig", "a papaya",
              "a passion fruit", "a physalis", "a lychee", "a pineapple", "a banana", "a kiwi",
              "an avocado", "a cucumber", "a zucchini", "a pumpkin", "a melon", "a watermelon",
              "a cantaloupe", "a grape", "a green grape", "a white onion", "a red onion", "a potato",
              "a beetroot", "a cabbage", "a red bell pepper", "a green bell pepper",
              "a yellow bell pepper", "an orange bell pepper", "a chili pepper", "an eggplant",
              "a strawberry", "a cherry", "a plum", "a pomegranate", "a red ball", "a leaf", "a person", "a human hand", "a finger", "a fingertip", "human skin", "a fingernail"]
