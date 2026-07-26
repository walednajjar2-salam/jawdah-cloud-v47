# Creates a large desktop app shortcut with emoji name + branded icon (256px ICO)
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktop = [Environment]::GetFolderPath("Desktop")
$icon = Join-Path $here "AppIcon.ico"
$exe = Join-Path $here "LaunchQuality.exe"
$bat = Join-Path $here "تشغيل-جودة-الانطلاقة.bat"
if (-not (Test-Path $bat)) { $bat = Join-Path $here "Run-LaunchQuality.bat" }

$target = if (Test-Path $exe) { $exe } else { $bat }
$shortcutName = "🏛️ جودة الانطلاقة.lnk"
$shortcutPath = Join-Path $desktop $shortcutName

# Also remove old plain-name shortcut if present
$legacy = @(
  (Join-Path $desktop "Launch Quality.lnk"),
  (Join-Path $desktop "LaunchQuality.lnk")
)
foreach ($old in $legacy) {
  if (Test-Path $old) { Remove-Item $old -Force -ErrorAction SilentlyContinue }
}

$wsh = New-Object -ComObject WScript.Shell
$s = $wsh.CreateShortcut($shortcutPath)
$s.TargetPath = $target
$s.WorkingDirectory = $here
$s.WindowStyle = 1
$s.Description = "🏛️ جودة الانطلاقة · Launch Quality ERP"
if (Test-Path $icon) {
  $s.IconLocation = "$icon,0"
}
$s.Save()

# Force Windows to refresh icon cache for this shortcut
try {
  $shell = New-Object -ComObject Shell.Application
  $shell.NameSpace($desktop).ParseName($shortcutName).InvokeVerb("refresh") 2>$null
} catch {}

Write-Host "تم إنشاء أيقونة سطح المكتب الكبيرة: $shortcutName" -ForegroundColor Green
Write-Host "المسار: $shortcutPath"
if (Test-Path $icon) {
  Write-Host "الأيقونة: AppIcon.ico (حتى 256x256 — مقاس تطبيقات ويندوز)"
}
