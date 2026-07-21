# Genesis Telegram channel watchdog (ASCII only).
# If no process is running the channel session, relaunch it in a visible
# PowerShell window (woken as Genesis) and notify Alan on Telegram.
# Scheduled every 15 minutes; runs only when the user is logged on.
$repo = 'C:\Users\agent\Project\Edgeweaver'
# Marker is skill-specific: with Alpha's channel session also running (birth run B6), a
# bare '--channels plugin:telegram' marker would match the sibling and mask a Genesis outage.
$marker = '*wake-edgeweaver-genesis*--channels plugin:telegram*'
$found = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -like $marker -and $_.Name -ne 'powershell.exe'
}
$wrapper = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq 'powershell.exe' -and ($_.CommandLine -like '*genesis-channel-launch.ps1*' -or $_.CommandLine -like '*EdgeweaverGenesisTelegram*') -and $_.CommandLine -notlike '*watchdog*'
}
# DEAF DETECTION (added 2026-07-17 after the birth-day outage): a session can be alive
# with a dead poller and a process check alone logs "ok" forever (this happened to Genesis
# for real). If the session is older than 3 minutes and its poller pid is missing or dead,
# kill the session tree so the relaunch below runs. NEVER probe getUpdates for health:
# Telegram hands the slot to the newest caller, so a probe lies and disrupts.
$pidFile = 'C:\Users\agent\.claude\channels\telegram\bot.pid'
if ($found) {
  $ageMin = (New-TimeSpan -Start $found[0].CreationDate -End (Get-Date)).TotalMinutes
  $pollerAlive = $false
  if (Test-Path $pidFile) {
    try { $pollerAlive = $null -ne (Get-Process -Id (Get-Content $pidFile) -ErrorAction SilentlyContinue) } catch {}
  }
  if ($ageMin -gt 3 -and -not $pollerAlive) {
    foreach ($p in @($found) + @($wrapper)) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }
    Remove-Item $pidFile -ErrorAction SilentlyContinue
    Add-Content -Path "$repo\logs\channel-watchdog.log" -Value "$(Get-Date -Format s) DEAF session killed (poller dead, session age $([math]::Round($ageMin,1))m)"
    $found = $null; $wrapper = $null
    Start-Sleep -Seconds 5
  }
}
# STALL DETECTION (added 2026-07-18, mirrored from the Alpha watchdog after Ali's first
# message sat unanswered ~40 min behind a permission prompt): channel-notify-hook.mjs
# writes a stall flag when a prompt appears (and DMs Alan); unanswered for 30+ minutes
# -> restart the session. Named cost: unwritten in-context memory is lost.
$stallFlag = "$repo\state\channel-stall-genesis.flag"
if ($found -and (Test-Path $stallFlag)) {
  $stallMin = (New-TimeSpan -Start (Get-Item $stallFlag).LastWriteTime -End (Get-Date)).TotalMinutes
  if ($stallMin -gt 30) {
    foreach ($p in @($found) + @($wrapper)) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }
    Remove-Item $pidFile -ErrorAction SilentlyContinue
    Remove-Item $stallFlag -ErrorAction SilentlyContinue
    Add-Content -Path "$repo\logs\channel-watchdog.log" -Value "$(Get-Date -Format s) FROZEN session killed (permission prompt unanswered $([math]::Round($stallMin,1))m)"
    $found = $null; $wrapper = $null
    Start-Sleep -Seconds 5
  }
}
# ORPHANED WRAPPER DETECTION (added 2026-07-21 after a 4-hour masked outage): the launcher
# window is -NoExit, so when claude dies at startup (or exits later) the empty wrapper
# keeps matching and the check below logs "ok" forever. Happened for real: the 11:21
# relaunch's claude died without ever writing a transcript and the wrapper hid it until an
# ops session went looking. If the wrapper is older than 5 minutes (startup grace) and no
# session process exists, kill the wrapper so the relaunch below runs.
if (-not $found -and $wrapper) {
  $wAgeMin = (New-TimeSpan -Start $wrapper[0].CreationDate -End (Get-Date)).TotalMinutes
  if ($wAgeMin -gt 5) {
    foreach ($p in @($wrapper)) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }
    Add-Content -Path "$repo\logs\channel-watchdog.log" -Value "$(Get-Date -Format s) ORPHANED wrapper killed (no session process, wrapper age $([math]::Round($wAgeMin,1))m)"
    $wrapper = $null
    Start-Sleep -Seconds 3
  }
}
if (-not $found -and -not $wrapper) {
  Remove-Item $stallFlag -ErrorAction SilentlyContinue
  # Launch via -File, never -Command (quote-mangling lesson, 2026-07-16, Alpha side).
  Start-Process powershell -WorkingDirectory $repo -ArgumentList '-NoExit','-ExecutionPolicy','Bypass','-File',
    "$repo\scripts\ops\genesis-channel-launch.ps1"
  $stamp = Get-Date -Format 'HH:mm'
  & node "$repo\scripts\ops\send-telegram.mjs" "Watchdog: the Genesis Telegram session was down and has been relaunched at $stamp. Give it a minute to wake, then it will answer normally. (Automated notice, not Genesis.)"
  Add-Content -Path "$repo\logs\channel-watchdog.log" -Value "$(Get-Date -Format s) relaunched channel session"
} else {
  Add-Content -Path "$repo\logs\channel-watchdog.log" -Value "$(Get-Date -Format s) ok"
}
