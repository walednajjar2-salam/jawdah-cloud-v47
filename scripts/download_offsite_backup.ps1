# Download latest Launch Quality backups from Railway to OneDrive (or any folder).
param(
    [string]$BaseUrl = "https://web-production-08d73.up.railway.app",
    [string]$Username = "admin",
    [string]$Password = "",
    [string]$DestRoot = "",
    [switch]$RunBackupFirst
)

$ErrorActionPreference = "Stop"

if (-not $Password) {
    $Password = $env:LAUNCH_QUALITY_OWNER_PASSWORD
}
if (-not $Password) {
    $secure = Read-Host "Password for $Username" -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

if (-not $DestRoot) {
    $oneDrive = Join-Path $env:USERPROFILE "OneDrive"
    if (-not (Test-Path $oneDrive)) {
        $oneDrive = Join-Path $env:USERPROFILE "OneDrive - Personal"
    }
    $DestRoot = Join-Path $oneDrive "Launch-Quality-Backups"
}

$monthDir = Join-Path $DestRoot (Get-Date -Format "yyyy-MM")
New-Item -ItemType Directory -Path $monthDir -Force | Out-Null

function Invoke-ApiJson($Method, $Path, $Body = $null, $Token = $null) {
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers.Authorization = "Bearer $Token" }
    $params = @{
        Uri = "$BaseUrl/api/$Path"
        Method = $Method
        Headers = $headers
        TimeoutSec = 120
    }
    if ($Body) { $params.Body = ($Body | ConvertTo-Json -Compress) }
    return Invoke-RestMethod @params
}

function Save-BackupFile($Kind, $Token, $Stamp, $OutDir) {
    $headers = @{ Authorization = "Bearer $Token" }
    $uri = "$BaseUrl/api/backup/download?kind=$Kind&timestamp=$Stamp"
    $ext = if ($Kind -eq "sqlite") { "sqlite3" } else { "json" }
    $out = Join-Path $OutDir "jawdah-$Stamp.$ext"
    Invoke-WebRequest -Uri $uri -Headers $headers -OutFile $out -TimeoutSec 300
    return $out
}

Write-Host "Launch Quality - offsite backup" -ForegroundColor Cyan
Write-Host "Source: $BaseUrl"
Write-Host "Destination: $monthDir"

$login = Invoke-ApiJson POST "login" @{ username = $Username; password = $Password }
$token = $login.token

if ($RunBackupFirst) {
    Write-Host "Creating fresh backup on server..."
    Invoke-ApiJson POST "backup/run" @{} $token | Out-Null
    Start-Sleep -Seconds 2
}

$stamp = (Get-Date -Format "yyyyMMdd-HHmmss")
$createdAt = (Get-Date).ToString("s")
$jsonPath = $null
$sqlitePath = $null
$usedArchive = $false

try {
    $status = Invoke-ApiJson GET "backup/status" $null $token
    $latest = $status.recent | Select-Object -First 1
    if (-not $latest) {
        throw "No automatic backups found on server."
    }
    $stamp = $latest.timestamp
    $createdAt = $latest.created_at
    Write-Host "Latest backup: $stamp ($createdAt)"
    $jsonPath = Save-BackupFile "json" $token $stamp $monthDir
    $sqlitePath = Save-BackupFile "sqlite" $token $stamp $monthDir
}
catch {
    Write-Host "backup/status unavailable ($($_.Exception.Message)); using backup/archive API..." -ForegroundColor Yellow
    $archive = Invoke-ApiJson GET "backup/archive" $null $token
    if (-not $archive.archive) {
        Write-Host "No archive payload returned." -ForegroundColor Red
        exit 1
    }
    $usedArchive = $true
    $stamp = (Get-Date -Format "yyyyMMdd-HHmmss")
    $createdAt = $archive.exported_at
    $jsonPath = Join-Path $monthDir "jawdah-$stamp.json"
    ($archive.archive | ConvertTo-Json -Depth 20 -Compress:$false) | Set-Content -Path $jsonPath -Encoding UTF8
    Write-Host "Saved live archive JSON (no sqlite snapshot in archive mode)."
}

$manifest = @{
    downloaded_at = (Get-Date).ToString("s")
    source = $BaseUrl
    timestamp = $stamp
    created_at = $createdAt
    mode = if ($usedArchive) { "archive" } else { "automatic" }
    files = @(
        @{ kind = "json"; path = $jsonPath; bytes = (Get-Item $jsonPath).Length }
    )
}
if ($sqlitePath -and (Test-Path $sqlitePath)) {
    $manifest.files += @{ kind = "sqlite"; path = $sqlitePath; bytes = (Get-Item $sqlitePath).Length }
}
$manifestPath = Join-Path $monthDir "manifest-$stamp.json"
$manifest | ConvertTo-Json -Depth 4 | Set-Content -Path $manifestPath -Encoding UTF8

Write-Host "Saved JSON:   $jsonPath" -ForegroundColor Green
if ($sqlitePath -and (Test-Path $sqlitePath)) {
    Write-Host "Saved SQLite: $sqlitePath" -ForegroundColor Green
}
Write-Host "Manifest:     $manifestPath" -ForegroundColor Green
Write-Host "Done. Keep this folder synced with OneDrive." -ForegroundColor Cyan
