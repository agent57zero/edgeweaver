$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$logDir = Join-Path $repoRoot 'logs'
$logPath = Join-Path $logDir 'genesis-night.log'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
Set-Location -LiteralPath $repoRoot
$env:EDGEWEAVER_NIGHT_LOOP_ORIGIN = 'scheduled'

try {
  & claude -p '/night-loop-lite-genesis' --model sonnet --output-format text *>> $logPath
  $claudeExit = $LASTEXITCODE
  if ($claudeExit -ne 0) { exit $claudeExit }
  & node scripts/night-loop/lite-live.mjs status *>> $logPath
  exit $LASTEXITCODE
}
catch {
  "$(Get-Date -Format o) runner failed: $($_.Exception.Message)" | Add-Content -LiteralPath $logPath
  exit 1
}
