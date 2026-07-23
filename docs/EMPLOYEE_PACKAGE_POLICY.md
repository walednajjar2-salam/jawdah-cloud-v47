# Employee Package Policy

## Package target

- Installer file name: `LaunchQuality-Setup.exe`
- Installer script: `scripts/LaunchQuality-Setup.iss`

## Must NOT be included in employee package

- `jawdah.sqlite3` / any `.sqlite`, `.sqlite3`, `.db`
- Source code files (`.py`, `.js` source tree, internal scripts)
- Session/cache/runtime artifacts
- Any password lists or plaintext secrets
- Any old logs, browser/session/cache folders

## Auto update approach

1. Publish new installer version to `public/releases/windows/LaunchQuality-Setup.exe`.
2. Update `public/releases/windows/latest.json` (version + installer_url + sha256).
3. Employee devices run `Update-LaunchQuality.ps1` automatically (Scheduled Task).
4. Rollout is automatic based on manifest version comparison.

### Windows update helper

- Script: `scripts/Update-LaunchQuality.ps1`
- Purpose: read `latest.json`, compare version, download, verify hash, and install silently.

Example:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Update-LaunchQuality.ps1 -ManifestUrl "https://web-production-08d73.up.railway.app/releases/windows/latest.json"
```

### One-command publish helper

- Script: `scripts/publish_windows_release.py`
- Non-technical guide: `docs/WINDOWS_RELEASE_ONE_CLICK_AR.md`

## Installer behavior requirements

- Single installer output: `LaunchQuality-Setup.exe`
- Creates shortcuts automatically:
  - Desktop icon
  - Start Menu entry
- Installer source policy is enforced in:
  - `scripts/LaunchQuality-Setup.iss`
