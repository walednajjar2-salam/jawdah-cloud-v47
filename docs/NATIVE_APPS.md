# Native apps (Windows + Android)

## Windows
- Page: `/get-windows`
- EXE: `/LaunchQuality.exe` → `/releases/windows/LaunchQuality-Setup.exe`
- ZIP: `/lq-portable.zip`

Rebuild launcher:

```bash
cd tools/windows/launcher
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-H windowsgui -s -w" -o ../../public/releases/windows/portable/LaunchQuality.exe .
cp ../../public/releases/windows/portable/LaunchQuality.exe ../../public/releases/windows/LaunchQuality-Setup.exe
(cd ../../public/releases/windows/portable && zip -r -9 ../LaunchQuality-Portable.zip .)
```

## Android
- Page: `/get-android`
- APK: `/releases/android/Launch-Quality-Staff.apk`
- Package id: `com.launchquality.staff`
- Channel version: `70.4.0` (versionCode `7040`)
- Opens production field URL inside a native WebView

Build APK:

```bash
LQ_APP_VERSION=70.4.0 LQ_APP_VERSION_CODE=7040 ./scripts/build_android_webview_apk.sh
```

Requires network on first run (Android SDK + Gradle). SDK stays under `tools/android/sdk/` (gitignored).
