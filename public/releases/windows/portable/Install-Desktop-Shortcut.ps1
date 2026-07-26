# Local package installer (runs from extracted ZIP folder)
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktop = [Environment]::GetFolderPath("Desktop")
$icon = Join-Path $here "AppIcon.ico"
$exe = Join-Path $here "LaunchQuality.exe"
if (-not (Test-Path $exe)) { throw "LaunchQuality.exe غير موجود بجانب هذا الملف" }

$name = "🏛️ جودة الانطلاقة.lnk"
$path = Join-Path $desktop $name
foreach ($old in @("Launch Quality.lnk", "LaunchQuality.lnk")) {
  $p = Join-Path $desktop $old
  if (Test-Path $p) { Remove-Item $p -Force -ErrorAction SilentlyContinue }
}

$wsh = New-Object -ComObject WScript.Shell
$s = $wsh.CreateShortcut($path)
$s.TargetPath = $exe
$s.WorkingDirectory = $here
$s.WindowStyle = 1
$s.Description = "🏛️ جودة الانطلاقة · Launch Quality ERP"
if (Test-Path $icon) { $s.IconLocation = "$icon,0" }
$s.Save()

Start-Process -FilePath $exe
Write-Host "تم إنشاء أيقونة سطح المكتب: $name" -ForegroundColor Green
Write-Host $path
