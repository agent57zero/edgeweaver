# Sibling room ear launcher (ASCII only; D44). Runs the listener-only bot that mirrors
# human messages from the one shared topic into ew_ops.sibling_room (room-ear.mjs;
# token EW_SIBLING_EAR_TOKEN in repo .env.local, never here). Self-healing loop: if
# the ear exits (network blip, node crash), wait 30s and start it again. Safe to run
# at logon (HKCU Run key, armed by Alan 2026-08-21). Two ears on one token would
# fight over getUpdates (one-poller-per-token, proven 2026-07-16), so exit if an
# ear is already running.
$dup = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*room-ear.mjs*' }
if ($dup) { exit 0 }
$host.UI.RawUI.WindowTitle = 'EdgeweaverRoomEar'
Set-Location 'C:\Users\agent\Project\Edgeweaver'
# cmd owns the stderr redirect: PS 5.1 wraps a native command's stderr in
# NativeCommandError records (the documented trap), which can abort the child
# under strict preferences. Proven live 2026-08-22: the direct 2>> form killed
# the ear seconds after its first stderr line.
while ($true) {
  cmd /c "node scripts\sibling\room-ear.mjs 2>> logs\room-ear.log"
  Start-Sleep -Seconds 30
}
