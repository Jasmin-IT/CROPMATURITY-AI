# Crop Maturity AI

Crop Maturity AI analyses tomato photos, estimates the maturity of detected tomatoes, and reports crop counts and harvest readiness. The project includes a FastAPI backend, a React web dashboard, and a Flutter mobile app for Android and iOS.

![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![YOLOv8](https://img.shields.io/badge/YOLOv8-segmentation-00A3E0)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![Flutter](https://img.shields.io/badge/Flutter-02569B?logo=flutter&logoColor=white)

> Harvest readiness is an AI-assisted indicator of the maturity mix in an image. It is not a guaranteed harvest date or a substitute for in-field judgment.

## Features

- Detects and segments tomatoes into three stages: unripe, semiripe, and ripe.
- Uses CLIP to help filter out objects that are not tomatoes.
- Reports counts, maturity percentages, and a harvest-readiness score.
- Provides AI analysis and agricultural question answering with knowledge-base sources.
- Saves analysis history and supports daily reports.
- Includes a web dashboard and a mobile app with crop inspection, live camera, history, advisor, and harvesting guide screens.

## How it works

```text
Image -> YOLOv8m-seg -> CLIP tomato check -> Counts and readiness -> AI recommendations
```

Readiness is calculated as:

```text
ripe percentage + (0.5 x semiripe percentage)
```

## Requirements

- Windows 10/11 (commands below use PowerShell), macOS, or Linux.
- Python 3.11.
- Git.
- Node.js and npm for the web dashboard.
- Flutter SDK and Android Studio/Android SDK for Android development.
- Xcode on macOS to build or run the iOS app.

## Setup

### 1. Get the project

```powershell
git clone https://github.com/Jasmin-IT/CROPMATURITY-AI.git
cd CROPMATURITY-AI
```

### 2. Install backend dependencies

From the project root, create and activate a Python environment, then install the packages:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell prevents environment activation, either allow local scripts for your user or run the environment's Python directly:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

The detector weights are expected at `models/yolov8m_seg_best.pt`. On first startup, the CLIP verifier may need an internet connection to download its pretrained model.

### 3. Configure optional AI credentials

The backend can use rule-based responses without an API key. To enable Gemini responses, create a `.env` file in the project root:

```dotenv
GEMINI_API_KEY=your_gemini_api_key
```

Keep `.env` private and do not commit API keys. Optional backup-provider settings are `BACKUP_API_KEY`, `BACKUP_BASE_URL`, and `BACKUP_MODEL`.

### 4. Prepare the agricultural knowledge index (optional)

The RAG knowledge index is stored under `data/chroma/`. To build or refresh it from the Markdown files in `knowledge_base/`, run:

```powershell
python -m app.rag
```

This recreates the index. You can skip this step if a usable index is already present.

## Run the application

Run the backend in its own PowerShell terminal from the project root:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.api:app --reload --host 127.0.0.1 --port 8000
```

The API documentation is at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs), and the health check is at [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health).

### Run the web dashboard

In another terminal from the project root:

```powershell
npm install --prefix frontend
npm run dev
```

Open the local URL printed by Vite in the terminal. The web dashboard expects the backend to be running on port 8000.

### Run the mobile app on an Android emulator

Install Flutter and Android Studio, then check the Android toolchain:

```powershell
flutter doctor
```

Accept any Android SDK licenses requested by Flutter and install the Android SDK platform it requests. In another terminal:

```powershell
cd mobile
flutter pub get
flutter devices
flutter run
```

The app's default API address, `http://10.0.2.2:8000`, is for an Android emulator connecting to the backend on the same computer. Keep the backend terminal running.

### Run the mobile app on a physical Android phone

1. Connect the phone and computer to the same Wi-Fi network. Enable Developer options and USB debugging on the phone, connect it by USB, and approve the debugging prompt.
2. Start the backend from the project root so the phone can reach it:

   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn app.api:app --reload --host 0.0.0.0 --port 8000
   ```

3. Run `ipconfig` and note the computer's IPv4 address under the active Wi-Fi adapter.
4. In a second terminal, enter the mobile project, find the device ID, then run the app with your computer's address:

   ```powershell
   cd mobile
   flutter pub get
   flutter devices
   flutter run -d DEVICE_ID --dart-define=API_BASE=http://"your ip address from the ip config":8000
   ```

   Replace `DEVICE_ID` with the ID from `flutter devices` and  the computer's current Wi-Fi IPv4 address. If Windows Firewall prompts you, allow Python on private networks.

The computer's Wi-Fi address can change, so update `API_BASE` when necessary. Keep the backend running while using the app. For additional mobile notes, see [mobile/README.md](mobile/README.md).

### iOS

Run iOS builds on macOS with Xcode installed. For the iOS Simulator, use the local backend address:

```bash
cd mobile
flutter pub get
flutter run --dart-define=API_BASE=http://127.0.0.1:8000
```

For a physical iPhone, use the computer's LAN IP for `API_BASE` and start the backend with `--host 0.0.0.0`, as described above for an Android phone.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Backend and model status |
| `POST` | `/predict` | Analyse an uploaded image |
| `GET` | `/history` | Retrieve saved analyses |
| `GET` | `/crop-statistics` | Retrieve crop counts |
| `GET` | `/harvest-readiness` | Retrieve the latest readiness score |
| `POST` | `/ai/analyze` | Generate analysis and recommendations |
| `POST` | `/ai/report` | Generate a daily report |
| `POST` | `/ai/chat` | Ask a question with agricultural knowledge-base context |

## Project structure

```text
app/              FastAPI backend, detection, database, AI, and RAG
frontend/         React web dashboard
mobile/           Flutter Android/iOS app
knowledge_base/   Agricultural reference documents used by RAG
models/           YOLO model weights
scripts/          Dataset preparation, evaluation, and benchmarks
```

## Limitations

- The model has three maturity classes; over-mature is not a separate class.
- Semiripe is the hardest class to distinguish because it lies between unripe and ripe.
- CLIP filtering reduces non-tomato detections but cannot eliminate every look-alike.
- Dark, blurry, crowded, or otherwise difficult images can reduce accuracy. Treat results as guidance and review them in context.

## Dataset and credits

The model was trained using [LaboroTomato](https://github.com/laboroai/LaboroTomato). The project uses [Ultralytics YOLO](https://github.com/ultralytics/ultralytics), [OpenAI CLIP](https://github.com/openai/CLIP), ChromaDB, FastAPI, Flutter, and React. Review the licenses for the datasets and dependencies before redistributing them.
