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
if (-not $found -and -not $wrapper) {
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
