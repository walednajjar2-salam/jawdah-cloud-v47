param(
    [string]$InstallerUrl = "https://example.com/releases/LaunchQuality-Setup.exe",
    [string]$InstallerPath = "$env:TEMP\LaunchQuality-Setup.exe"
)

Write-Host "Downloading latest LaunchQuality installer..."
Invoke-WebRequest -Uri $InstallerUrl -OutFile $InstallerPath -UseBasicParsing

Write-Host "Running installer silently..."
Start-Process -FilePath $InstallerPath -ArgumentList "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART" -Wait

Write-Host "Update completed."

