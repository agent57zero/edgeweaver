$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$logDir = Join-Path $repoRoot 'logs'
$logPath = Join-Path $logDir 'genesis-night.log'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
Set-Location -LiteralPath $repoRoot

try {
  & claude -p '/night-loop-lite-genesis' --model sonnet --output-format text *>> $logPath
  exit $LASTEXITCODE
}
catch {
  "$(Get-Date -Format o) runner failed: $($_.Exception.Message)" | Add-Content -LiteralPath $logPath
  exit 1
}
