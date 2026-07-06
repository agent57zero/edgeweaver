# task-import-test.ps1 - OUT-OF-BAND arming-time check for tasks/*.xml (NOT the default dark
# verify; that is verify-tasks.mjs, which is static and touches nothing). Imports each task
# definition into Task Scheduler, confirms it registered DISABLED, then removes it (self-cleaning,
# leaves the machine unchanged). This is the live round-trip PREBUILD A2 names; it runs at arming
# (Phase 4 + G5), or on demand for evidence.
#
# NOTE: the repo keeps tasks/*.xml as UTF-8 (readable, diffable, what verify-tasks.mjs parses).
# schtasks /Create /XML requires UTF-16, so this script converts to a UTF-16 temp copy first
# (declaration swapped to match the bytes). Arming does the same conversion.
# Usage: powershell -NoProfile -File scripts/verify/task-import-test.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$tasks = Get-ChildItem (Join-Path $root 'tasks') -Filter '*.xml'
$fail = $false
foreach ($t in $tasks) {
  $tn = '\Edgeweaver\_darkverify_' + $t.BaseName
  $tmp = Join-Path $env:TEMP ($t.BaseName + '_utf16.xml')
  try {
    $text = (Get-Content -Raw -LiteralPath $t.FullName) -replace 'encoding="UTF-8"', 'encoding="UTF-16"'
    [System.IO.File]::WriteAllText($tmp, $text, (New-Object System.Text.UnicodeEncoding($false, $true)))
    schtasks /Create /TN $tn /XML $tmp /F | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Output ('FAIL  ' + $t.Name + ' (schtasks /Create exit ' + $LASTEXITCODE + ')'); $fail = $true; continue }
    $q = schtasks /Query /TN $tn /FO LIST /V | Out-String
    if ($q -match 'Disabled') { Write-Output ('PASS  ' + $t.Name + ' (imported, state Disabled)') }
    else { Write-Output ('FAIL  ' + $t.Name + ' (imported but not Disabled)'); $fail = $true }
  } catch {
    Write-Output ('FAIL  ' + $t.Name + ' (' + $_.Exception.Message + ')'); $fail = $true
  } finally {
    schtasks /Delete /TN $tn /F | Out-Null
    if (Test-Path $tmp) { Remove-Item $tmp -Force }
  }
}
if ($fail) { Write-Output 'SOME FAILED'; exit 1 } else { Write-Output 'ALL PASS (definitions import Disabled and remove cleanly)'; exit 0 }
