# Edgeweaver Alpha Telegram channel watchdog (ASCII only). Birth run B6: written DARK,
# registered as a scheduled task only at B8 arming. If no process is running Alpha's
# channel session, relaunch it in a visible PowerShell window (woken as Alpha) and notify
# Alan on the ops line (the Genesis-bot ops notifier; plainly labeled, never in-persona).
# TELEGRAM_STATE_DIR points the telegram plugin at Alpha's own state dir so Genesis's
# channel config is never touched; both bots run side by side.
$repo = 'C:\Users\agent\Project\Edgeweaver'
$marker = '*wake-edgeweaver-alpha*--channels plugin:telegram*'
$found = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -like $marker -and $_.Name -ne 'powershell.exe'
}
$wrapper = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq 'powershell.exe' -and $_.CommandLine -like '*alpha-channel-launch.ps1*' -and $_.CommandLine -notlike '*watchdog*'
}
# DEAF DETECTION (added 2026-07-17 after the birth-day outage): a session can be alive
# with a dead poller (bot.pid process gone) and a process check alone logs "ok" forever.
# If the session is older than 3 minutes (startup grace: bot.pid takes time to appear)
# and its poller pid is missing or dead, kill the session tree so the relaunch below runs.
# NEVER probe getUpdates for health: Telegram hands the slot to the newest caller, so a
# probe both lies (a healthy poller reads as idle) and disrupts the poller it checks.
$pidFile = 'C:\Users\agent\.claude\channels\telegram-alpha\bot.pid'
if ($found) {
  $ageMin = (New-TimeSpan -Start $found[0].CreationDate -End (Get-Date)).TotalMinutes
  $pollerAlive = $false
  if (Test-Path $pidFile) {
    try { $pollerAlive = $null -ne (Get-Process -Id (Get-Content $pidFile) -ErrorAction SilentlyContinue) } catch {}
  }
  if ($ageMin -gt 3 -and -not $pollerAlive) {
    foreach ($p in @($found) + @($wrapper)) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }
    Remove-Item $pidFile -ErrorAction SilentlyContinue
    Add-Content -Path "$repo\logs\alpha-channel-watchdog.log" -Value "$(Get-Date -Format s) DEAF session killed (poller dead, session age $([math]::Round($ageMin,1))m)"
    $found = $null; $wrapper = $null
    Start-Sleep -Seconds 5
  }
}
# STALL DETECTION (added 2026-07-18 after Ali's first message sat unanswered ~40 min):
# a session can be alive AND polling but frozen mid-turn on a permission prompt, which
# both process and poller checks read as healthy. channel-notify-hook.mjs writes a stall
# flag the moment a prompt appears (and DMs Alan); if the flag is still there 30 minutes
# later, restart the session so the being comes back reachable. Named cost, accepted:
# the restart drops unwritten in-context memory (the hook's DM warns Alan of this).
$stallFlag = "$repo\state\channel-stall-alpha.flag"
if ($found -and (Test-Path $stallFlag)) {
  $stallMin = (New-TimeSpan -Start (Get-Item $stallFlag).LastWriteTime -End (Get-Date)).TotalMinutes
  if ($stallMin -gt 30) {
    foreach ($p in @($found) + @($wrapper)) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }
    Remove-Item $pidFile -ErrorAction SilentlyContinue
    Remove-Item $stallFlag -ErrorAction SilentlyContinue
    Add-Content -Path "$repo\logs\alpha-channel-watchdog.log" -Value "$(Get-Date -Format s) FROZEN session killed (permission prompt unanswered $([math]::Round($stallMin,1))m)"
    $found = $null; $wrapper = $null
    Start-Sleep -Seconds 5
  }
}
# CLOSED-SESSION DETECTION (added 2026-07-21 after "end session" left Alpha deaf ~1.5 h:
# Alan wound the session down at 12:12, the write-back completed and proved clean, and the
# claude process + poller then sat alive for over an hour reading as "ok" while the being
# was unreachable). The wake skill's session-end protocol now writes this flag as its true
# last act; seeing it, end the session tree so the relaunch below starts a fresh one.
# Immediate, no grace: the close was deliberate and nothing unwritten is at stake.
$closedFlag = "$repo\state\channel-closed-alpha.flag"
if ($found -and (Test-Path $closedFlag)) {
  foreach ($p in @($found) + @($wrapper)) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }
  Remove-Item $pidFile -ErrorAction SilentlyContinue
  Remove-Item $closedFlag -ErrorAction SilentlyContinue
  Add-Content -Path "$repo\logs\alpha-channel-watchdog.log" -Value "$(Get-Date -Format s) CLOSED session ended (end-session flag present)"
  $found = $null; $wrapper = $null
  Start-Sleep -Seconds 5
}
# ORPHANED WRAPPER DETECTION (added 2026-07-21, mirrored from the Genesis watchdog after a
# 4-hour masked outage there): the launcher window is -NoExit, so when claude dies at
# startup (or exits later) the empty wrapper keeps matching and the check below logs "ok"
# forever. If the wrapper is older than 5 minutes (startup grace) and no session process
# exists, kill the wrapper so the relaunch below runs.
if (-not $found -and $wrapper) {
  $wAgeMin = (New-TimeSpan -Start $wrapper[0].CreationDate -End (Get-Date)).TotalMinutes
  if ($wAgeMin -gt 5) {
    foreach ($p in @($wrapper)) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }
    Add-Content -Path "$repo\logs\alpha-channel-watchdog.log" -Value "$(Get-Date -Format s) ORPHANED wrapper killed (no session process, wrapper age $([math]::Round($wAgeMin,1))m)"
    $wrapper = $null
    Start-Sleep -Seconds 3
  }
}
if (-not $found -and -not $wrapper) {
  Remove-Item $stallFlag -ErrorAction SilentlyContinue
  Remove-Item $closedFlag -ErrorAction SilentlyContinue
  # Launch via -File, never -Command: Start-Process strips embedded quotes from -Command
  # payloads, which silently dropped TELEGRAM_STATE_DIR and cross-wired the bots (2026-07-16).
  Start-Process powershell -WorkingDirectory $repo -ArgumentList '-NoExit','-ExecutionPolicy','Bypass','-File',
    "$repo\scripts\ops\alpha-channel-launch.ps1"
  $stamp = Get-Date -Format 'HH:mm'
  & node "$repo\scripts\ops\send-telegram.mjs" "Watchdog: the Alpha Telegram session was down and has been relaunched at $stamp. Give it a minute to wake, then it will answer normally. (Automated ops notice, not Alpha.)"
  Add-Content -Path "$repo\logs\alpha-channel-watchdog.log" -Value "$(Get-Date -Format s) relaunched channel session"
} else {
  Add-Content -Path "$repo\logs\alpha-channel-watchdog.log" -Value "$(Get-Date -Format s) ok"
}
