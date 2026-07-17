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
