# Crop Maturity AI

Flutter recreation of the AgriHarvest React website, connected to the same FastAPI backend. It carries over the site header, scenic hero, three linked photo cards, light/dark theme, crop analysis and annotated image comparison, interactive picking checklist, continuous live camera scanner, history charts and record actions, daily report sharing, session-specific Farm Advisor chat, and harvesting guide.

## Run on an Android phone (Windows)

The Flutter app talks directly to the FastAPI backend; you do not need to start the React/Vite frontend. Keep the phone and computer on the same Wi-Fi network.

### One-time setup

- Install Flutter and the Android SDK, then confirm `flutter doctor` completes.
- On the phone, enable Developer options and USB debugging, connect it by USB, and accept the debugging authorization prompt.
- From `mobile/`, fetch the Flutter packages:

```powershell
flutter pub get
flutter devices
```

Note the phone's device ID shown by `flutter devices`.

### Start the app

1. In a PowerShell terminal at the repository root, start the backend so it accepts connections from your phone:

```powershell
.\venv\Scripts\python.exe -m uvicorn app.api:app --host 0.0.0.0 --port 8000
```

Leave this terminal open. If your Python environment is not in `venv`, activate the environment that has the project requirements installed and use `python -m uvicorn app.api:app --host 0.0.0.0 --port 8000` instead.

2. Find the computer's current Wi-Fi IPv4 address by running `ipconfig`. Use the IPv4 Address under the Wi-Fi adapter (for example, `192.168.1.13`).

3. In a second PowerShell terminal, change to `mobile/` and run Flutter, replacing the example IP with the address from step 2 and the device ID with the one from `flutter devices`:

```powershell
cd "E:\Desktop\final projecttttttttttt\mobile"
flutter run -d 5P8LIZIBV849D6OF --dart-define=API_BASE=http://192.168.1.13:8000
```

Keep both terminals open while using the app. If Windows Firewall prompts you, allow Python on private networks. To verify the backend is reachable from the computer, open `http://127.0.0.1:8000/health`.

The computer's Wi-Fi address can change. If it does, rerun `flutter run` with the new address; the backend must still be running. Live camera requires the app's camera permission.

## Other targets

- Android emulator: uses `http://10.0.2.2:8000` by default; start the backend on the computer.
- iOS Simulator: use `http://127.0.0.1:8000` as `API_BASE`.
- The API must be reachable from the device. Android builds need Android SDK Platform 35; install it through Android Studio's SDK Manager if Flutter prompts for it.
