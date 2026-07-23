#!/usr/bin/env bash
# Build LaunchQuality.exe + LaunchQuality-Setup.exe on Linux (cross-compile).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${1:-49.1.0}"
DIST="$ROOT/dist"
PAYLOAD="$ROOT/tools/windows/setup/payload"
LAUNCHER_DIR="$ROOT/tools/windows/launcher"
SETUP_DIR="$ROOT/tools/windows/setup"
OUT_SETUP="$ROOT/scripts/LaunchQuality-Setup.exe"

mkdir -p "$DIST" "$PAYLOAD"

echo "==> Building LaunchQuality.exe (Windows amd64) v${VERSION}"
(
  cd "$LAUNCHER_DIR"
  GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w -H windowsgui" -o "$DIST/LaunchQuality.exe" .
)

echo "==> Preparing installer payload"
rm -rf "$PAYLOAD"
mkdir -p "$PAYLOAD"
cp "$DIST/LaunchQuality.exe" "$PAYLOAD/LaunchQuality.exe"
cp "$ROOT/scripts/Update-LaunchQuality.ps1" "$PAYLOAD/Update-LaunchQuality.ps1"
cp "$ROOT/scripts/Enable-LaunchQuality-AutoUpdate.ps1" "$PAYLOAD/Enable-LaunchQuality-AutoUpdate.ps1"
printf '%s\n' "$VERSION" > "$PAYLOAD/version.txt"

echo "==> Building LaunchQuality-Setup.exe"
(
  cd "$SETUP_DIR"
  GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w -H windowsgui" -o "$OUT_SETUP" .
)

echo "==> Publishing release to public/releases/windows"
python3 "$ROOT/scripts/publish_windows_release.py" \
  --installer "$OUT_SETUP" \
  --version "$VERSION" \
  --notes "Windows installer ready for employees." \
  --notes "Opens production cloud app in Edge/Chrome app mode." \
  --notes "Includes automatic update task."

ls -lah "$DIST/LaunchQuality.exe" "$OUT_SETUP" "$ROOT/public/releases/windows/LaunchQuality-Setup.exe"
echo "DONE: installer ready"
