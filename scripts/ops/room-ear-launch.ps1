# Sibling room ear launcher (ASCII only; D44). Runs the listener-only bot that mirrors
# human messages from the one shared topic into ew_ops.sibling_room (room-ear.mjs;
# token EW_SIBLING_EAR_TOKEN in repo .env.local, never here). Self-healing loop: if
# the ear exits (network blip, node crash), wait 30s and start it again. Safe to run
# at logon via Task Scheduler. Two ears on one token would fight over getUpdates
# (one-poller-per-token, proven 2026-07-16), so do not start this by hand if the
# EdgeweaverRoomEar task or window is already running.
$host.UI.RawUI.WindowTitle = 'EdgeweaverRoomEar'
Set-Location 'C:\Users\agent\Project\Edgeweaver'
while ($true) {
  node scripts\sibling\room-ear.mjs 2>> logs\room-ear.log
  Start-Sleep -Seconds 30
}
