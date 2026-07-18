# Edgeweaver Genesis Telegram channel launcher (ASCII only). Run by the watchdog via
# -File, never -Command: Start-Process -Command payloads MANGLE embedded quotes (proven
# 2026-07-16 on the Alpha side, when a dropped env assignment cross-wired the bots).
# EDGEWEAVER_CHANNEL_BEING marks this as a channel session for the stall-alert hooks
# (channel-notify-hook.mjs); it must be set BEFORE claude starts so hooks inherit it.
# Genesis uses the telegram plugin's default state dir (~/.claude/channels/telegram).
$env:EDGEWEAVER_CHANNEL_BEING = 'genesis'
$host.UI.RawUI.WindowTitle = 'EdgeweaverGenesisTelegram'
Set-Location 'C:\Users\agent\Project\Edgeweaver'
claude "/wake-edgeweaver-genesis" --model claude-fable-5 --channels plugin:telegram@claude-plugins-official
