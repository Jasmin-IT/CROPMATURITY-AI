# Tomato Maturity Detection and Harvest Readiness AI

An AI system that detects tomatoes in images, classifies their maturity, counts the crop, scores harvest readiness, and explains the result in plain language with a GenAI assistant grounded in the actual detections and an agricultural knowledge base.

![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![YOLOv8](https://img.shields.io/badge/YOLOv8-segmentation-00A3E0)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)

> Harvest readiness is an AI-assisted indicator of the current maturity mix. It is not a guarantee and not a harvest date prediction.

## Features

- Tomato detection and segmentation with **YOLOv8m-seg**, in three stages: unripe, semiripe and ripe
- **CLIP verification** that removes objects that are not tomatoes
- Counting, maturity percentages and a **harvest readiness score**
- **AI analysis and recommendations** from an LLM that may only use the numbers the vision model produced
- **Question answering with RAG** over an agricultural knowledge base, with sources shown
- **History and trends** stored in SQLite, plus a daily report
- Graceful fallbacks: primary LLM, then a backup LLM, then rule-based text

## How it works


Image  ->  YOLOv8m-seg  ->  CLIP tomato check  ->  Counts + readiness  ->  LLM + RAG  ->  Dashboard


Readiness = ripe % + 0.5 x semiripe %.

## Results

Measured on the held-out test split (162 images, 2,020 tomatoes).

| Metric | Box | Mask |
|---|---|---|
| Precision | 0.812 | 0.811 |
| Recall | 0.840 | 0.839 |
| mAP@50 | 0.887 | 0.884 |
| mAP@50-95 | 0.778 | 0.746 |

Mask mAP@50-95 by class: unripe 0.798, semiripe 0.709, ripe 0.732.
CPU inference (laptop, 640 px, detector only): about 460 ms per image.

## Setup

**Requirements:** Python 3.11, Node.js, Git.

```bash
# 1. Clone
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>

# 2. Create a virtual environment
python -m venv venv
venv\Scripts\activate            # macOS/Linux: source venv/bin/activate

# 3. Install the requirements
pip install -r requirements.txt

# 4. Build the knowledge base index
python -m app.rag
```

**Model weights:** The `yolov8m_seg_best.pt` is already included in the project files. You can find it in the `models/` folder.

**API keys:** copy `.env.example` to `.env` and add your keys (Gemini for the main LLM, optional Groq-compatible backup). Without keys the app still runs with rule-based text.

## Run

**Backend** (from the project root, with the virtual environment active):

```bash
python -m uvicorn app.api:app --reload
```

API docs: http://127.0.0.1:8000/docs

**Frontend** (in a second terminal):

```bash
cd dashboard
npm install
npm run dev
```

Open http://localhost:5173

## API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/predict` | Analyse an image |
| GET | `/history` | Saved analyses |
| GET | `/crop-statistics` | Latest counts |
| GET | `/harvest-readiness` | Latest readiness |
| POST | `/ai/analyze` | AI analysis and recommendation |
| POST | `/ai/report` | Daily report |
| POST | `/ai/chat` | Question answering with RAG |
| GET | `/health` | Service health |

## Project structure

```
app/              Backend: detection, verification, API, database, LLM, RAG
dashboard/        React frontend
knowledge_base/   Agricultural reference documents for RAG
scripts/          Dataset preparation, evaluation and benchmarks
models/           Model weights (not stored in Git)
```

## Limitations

- Three maturity stages only; there is no over-mature class in the training data.
- Semiripe is the hardest class, as it sits between unripe and ripe.
- The tomato check removes most non-tomato objects but not all look-alikes, and accuracy drops in very dark, blurry or crowded scenes.

## Dataset and credits

Trained on [LaboroTomato](https://github.com/laboroai/LaboroTomato). Built with [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics), [OpenAI CLIP](https://github.com/openai/CLIP), ChromaDB, FastAPI and React. Check each dataset and library license before redistributing.
=======
