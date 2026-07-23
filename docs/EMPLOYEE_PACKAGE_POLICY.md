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

1. Publish new installer version.
2. Keep app version in release notes.
3. Employee endpoints check should compare running version vs latest.
4. Rollout can be enforced by operations during login window.

### Windows update helper

- Script: `scripts/Update-LaunchQuality.ps1`
- Purpose: download and run latest `LaunchQuality-Setup.exe` silently.

Example:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Update-LaunchQuality.ps1 -InstallerUrl "https://<your-release-url>/LaunchQuality-Setup.exe"
```

## Installer behavior requirements

- Single installer output: `LaunchQuality-Setup.exe`
- Creates shortcuts automatically:
  - Desktop icon
  - Start Menu entry
- Installer source policy is enforced in:
  - `scripts/LaunchQuality-Setup.iss`
