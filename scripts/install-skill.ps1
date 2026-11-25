<#
.SYNOPSIS
  Install the drawio-mcp skill with a timestamped backup and a version stamp.

.EXAMPLE
  .\scripts\install-skill.ps1
  .\scripts\install-skill.ps1 -Target "D:\agent\skills" -Force
#>
[CmdletBinding()]
param(
  [string]$Target = (Join-Path $env:USERPROFILE ".sclaw\agent\skills"),
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root "skills\drawio-mcp"
$dest = Join-Path $Target "drawio-mcp"

if (-not (Test-Path $source)) { throw "skill source not found: $source" }

function Get-RepoVersion {
  $pkg = Join-Path $root "package.json"
  if (Test-Path $pkg) {
    $json = Get-Content $pkg -Raw | ConvertFrom-Json
    return $json.version
  }
  return "unknown"
}

$version = Get-RepoVersion
New-Item -ItemType Directory -Force -Path $Target | Out-Null

if (Test-Path $dest) {
  if (-not $Force) {
    Write-Host "existing skill found: $dest" -ForegroundColor Yellow
    $answer = Read-Host "Overwrite? A backup will be created. [y/N]"
    if ($answer -notmatch '^(y|yes)$') { Write-Host "aborted"; exit 1 }
  }
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backup = "$dest.bak-$stamp"
  Copy-Item -Recurse -Force $dest $backup
  Write-Host "backup: $backup" -ForegroundColor DarkGray
  Remove-Item -Recurse -Force $dest
}

Copy-Item -Recurse -Force $source $dest

$stampFile = Join-Path $dest ".install.json"
@{
  name = "drawio-mcp"
  version = $version
  installedAt = (Get-Date).ToString("o")
  source = $source
} | ConvertTo-Json | Set-Content -Path $stampFile -Encoding UTF8

$manifestPath = Join-Path $dest "manifest.json"
if (Test-Path $manifestPath) {
  $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
  $bad = 0
  foreach ($entry in $manifest.files) {
    $file = Join-Path $dest ($entry.path -replace '/', '\')
    if (-not (Test-Path $file)) { Write-Warning "missing: $($entry.path)"; $bad++; continue }
    $hash = (Get-FileHash -Algorithm SHA256 $file).Hash.ToLower()
    if ($hash -ne $entry.sha256) { Write-Warning "hash mismatch: $($entry.path)"; $bad++ }
  }
  if ($bad -eq 0) { Write-Host "manifest verified: $($manifest.files.Count) file(s)" -ForegroundColor Green }
  else { Write-Warning "$bad file(s) failed verification" }
}

Write-Host "installed drawio-mcp v$version -> $dest" -ForegroundColor Green
Write-Host "restart the client or reload skills to pick it up."
