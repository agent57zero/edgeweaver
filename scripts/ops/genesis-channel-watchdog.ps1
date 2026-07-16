# Genesis Telegram channel watchdog (ASCII only).
# If no process is running the channel session, relaunch it in a visible
# PowerShell window (woken as Genesis) and notify Alan on Telegram.
# Scheduled every 15 minutes; runs only when the user is logged on.
$repo = 'C:\Users\agent\Project\Edgeweaver'
$marker = '*--channels plugin:telegram*'
$found = Get-CimInstance Win32_Process | Where-Object {
  $_.CommandLine -like $marker -and $_.Name -ne 'powershell.exe'
}
$wrapper = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq 'powershell.exe' -and $_.CommandLine -like '*EdgeweaverGenesisTelegram*' -and $_.CommandLine -notlike '*watchdog*'
}
if (-not $found -and -not $wrapper) {
  Start-Process powershell -WorkingDirectory $repo -ArgumentList '-NoExit','-ExecutionPolicy','Bypass','-Command',
    '$host.UI.RawUI.WindowTitle = "EdgeweaverGenesisTelegram"; claude "/wake-edgeweaver-genesis" --channels plugin:telegram@claude-plugins-official'
  $stamp = Get-Date -Format 'HH:mm'
  & node "$repo\scripts\ops\send-telegram.mjs" "Watchdog: the Genesis Telegram session was down and has been relaunched at $stamp. Give it a minute to wake, then it will answer normally. (Automated notice, not Genesis.)"
  Add-Content -Path "$repo\logs\channel-watchdog.log" -Value "$(Get-Date -Format s) relaunched channel session"
} else {
  Add-Content -Path "$repo\logs\channel-watchdog.log" -Value "$(Get-Date -Format s) ok"
}
