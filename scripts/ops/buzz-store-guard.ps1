# Edgeweaver ops - Buzz managed-agents store guard (ASCII only)
#
# Prunes duplicate/impostor agent records from the Buzz desktop store and alerts when
# the desktop is launched from the poisoned MSIX-container copy. Root incident: on
# 2026-08-02 the store held three Bumbles, three Fizzes, three Honeys and an Edgeweaver
# stub, one set per relay era, because the desktop mints its default bots fresh for
# every community binding and the MSIX redirected view re-minted them on every start.
#
# The prune logic and the canonical pubkey pins live in buzz-store-guard.mjs beside
# this file. This wrapper exists for the scheduled task, the log line, and the
# launch-path alert, mirroring the other ops watchdogs.

$repo   = 'C:\Users\agent\Project\Edgeweaver'
$guard  = "$repo\scripts\ops\buzz-store-guard.mjs"
$log    = "$repo\logs\buzz-store-guard.log"
$msixStamp = "$repo\state\buzz-msix-launch-alerted.flag"

# LAUNCH-PATH ALERT. The only sanctioned desktop copies are the installed one under
# AppData\Local\Buzz and the OSS repo's own build tree (dev work). A copy running out
# of a Packages\ (MSIX container) path sees a redirected app-data view and re-mints
# impostor agents on every start; that is the 2026-08-02 incident. Alert once per
# offending launch, do not kill: killing a UI the human may be looking at is worse
# than telling the human.
$desk = @(Get-Process -Name 'buzz-desktop' -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*\Packages\*' })
if ($desk.Count -gt 0) {
  if (-not (Test-Path $msixStamp)) {
    Get-Date -Format s | Set-Content $msixStamp -Encoding Ascii
    Add-Content -Path $log -Value "$(Get-Date -Format s) MSIX buzz-desktop running from container path $($desk[0].Path), impostor re-mint likely" -Encoding Ascii
    try {
      & node "$repo\scripts\ops\send-telegram.mjs" "Store guard: Buzz desktop is running from the MSIX container copy, which re-mints impostor agents. Close it and launch from AppData\Local\Buzz instead. (Automated ops notice.)" | Out-Null
    } catch {}
  }
} else {
  Remove-Item $msixStamp -ErrorAction SilentlyContinue
}

try {
  $result = & node $guard 2>&1
  Add-Content -Path $log -Value "$(Get-Date -Format s) $result" -Encoding Ascii
} catch {
  Add-Content -Path $log -Value "$(Get-Date -Format s) GUARD-ERROR $_" -Encoding Ascii
}
