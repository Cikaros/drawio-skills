<#
.SYNOPSIS
  Read-only environment and repository self-check for drawio-skills.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
$problems = 0

function Ok($msg) { Write-Host "  OK   $msg" -ForegroundColor Green }
function Bad($msg) { Write-Host "  FAIL $msg" -ForegroundColor Red; $script:problems++ }
function Info($msg) { Write-Host "  --   $msg" -ForegroundColor DarkGray }

Write-Host "drawio-skills doctor" -ForegroundColor Cyan
Write-Host "root: $root"

Write-Host "`n[runtime]"
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { Bad "node not found (need >= 20)" }
else {
  $version = (& node -v).TrimStart('v')
  $major = [int]($version.Split('.')[0])
  if ($major -ge 20) { Ok "node $version" } else { Bad "node $version (need >= 20)" }
}
$git = Get-Command git -ErrorAction SilentlyContinue
if ($git) { Ok "git $((& git --version) -replace '^git version ','')" } else { Info "git not found (optional)" }

Write-Host "`n[repository]"
$required = @(
  "README.md", "package.json", "skills\drawio-mcp\SKILL.md",
  "skills\drawio-mcp\scripts\validate-drawio.mjs",
  "skills\drawio-mcp\scripts\lib\drawio-lint.mjs",
  "shared\drawio-lint.mjs", "scripts\validate-drawio.mjs",
  "examples\01-approval-flow.drawio", "verification\compatibility.md"
)
foreach ($item in $required) {
  if (Test-Path (Join-Path $root $item)) { Ok $item } else { Bad "missing $item" }
}

Write-Host "`n[manifest]"
& node (Join-Path $root "scripts\build-manifest.mjs") --check
if ($LASTEXITCODE -ne 0) { Bad "manifest drift (run: npm run manifest)" } else { Ok "manifest matches files" }

Write-Host "`n[examples]"
& node (Join-Path $root "scripts\validate-drawio.mjs") --strict (Join-Path $root "examples\01-approval-flow.drawio")
if ($LASTEXITCODE -ne 0) { Bad "example validation failed" } else { Ok "example validates" }

Write-Host "`n[skill installation]"
$installedRoot = Join-Path $env:USERPROFILE ".sclaw\agent\skills\drawio-mcp"
$installedSkill = Join-Path $installedRoot "SKILL.md"
$installedValidator = Join-Path $installedRoot "scripts\validate-drawio.mjs"
if (Test-Path $installedSkill) {
  Ok "installed at $installedSkill"
  if (Test-Path $installedValidator) { Ok "installed skill has validator" }
  else { Bad "installed skill is incomplete: missing scripts\validate-drawio.mjs (reinstall)" }
} else { Info "not installed (run: .\scripts\install-skill.ps1)" }

Write-Host "`n[draw.io editor]"
$localAppData = $env:LOCALAPPDATA
if (-not $localAppData) { $localAppData = [Environment]::GetFolderPath('LocalApplicationData') }
$candidates = @(
  "C:\Program Files\draw.io\draw.io.exe",
  "C:\Program Files (x86)\draw.io\draw.io.exe"
)
if ($localAppData) { $candidates += (Join-Path $localAppData "Programs\draw.io\draw.io.exe") }
$desktop = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if ($desktop) { Ok "desktop: $desktop" } else { Info "draw.io desktop not found (export PNG/SVG unavailable)" }
Info "cloud editor: https://app.diagrams.net (used by open_drawio_* previews)"

Write-Host ""
if ($problems -gt 0) {
  Write-Host "$problems problem(s) found" -ForegroundColor Red
  exit 1
}
Write-Host "no problems found" -ForegroundColor Green
