# Edgeweaver Genesis Telegram channel launcher (ASCII only). Run by the watchdog via
# -File, never -Command: Start-Process -Command payloads MANGLE embedded quotes (proven
# 2026-07-16 on the Alpha side, when a dropped env assignment cross-wired the bots).
# EDGEWEAVER_CHANNEL_BEING marks this as a channel session for the stall-alert hooks
# (channel-notify-hook.mjs); it must be set BEFORE claude starts so hooks inherit it.
# Genesis's Telegram state lives in its OWN dir (moved 2026-07-21): the plugin's default
# dir (~/.claude/channels/telegram) is deliberately tokenless now, because any stray
# session with the telegram plugin enabled defaults there and hijacks the bot (happened
# twice on 2026-07-21: an ops desktop session at 12:16 and the staff-program login at
# 14:36; the plugin's stale-holder logic kills the legitimate poller each time).
$env:TELEGRAM_STATE_DIR = 'C:\Users\agent\.claude\channels\telegram-genesis'
$env:EDGEWEAVER_CHANNEL_BEING = 'genesis'
# Keep OUR window title: claude overwrites the terminal title at startup unless this is
# set (proven live 2026-07-21 on 2.1.177; the alternate name CLAUDE_CODE_DISABLE_TITLE
# does NOT work on this version). This is why Alan had to rename tabs by hand.
$env:CLAUDE_CODE_DISABLE_TERMINAL_TITLE = '1'
$host.UI.RawUI.WindowTitle = 'EdgeweaverGenesisTelegram'
Set-Location 'C:\Users\agent\Project\Edgeweaver'
claude "/wake-edgeweaver-genesis" --model claude-fable-5 --channels plugin:telegram@claude-plugins-official
