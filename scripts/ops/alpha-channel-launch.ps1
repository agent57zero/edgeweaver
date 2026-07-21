# Edgeweaver Alpha Telegram channel launcher (ASCII only). Run by the watchdog via
# -File: a dedicated script file because Start-Process -Command payloads MANGLE embedded
# quotes (proven 2026-07-16: the env assignment silently failed and the telegram plugin
# fell back to Genesis's state dir, hijacking its poller). -File has no such quoting layer.
# TELEGRAM_STATE_DIR must be set BEFORE claude starts: the plugin's MCP server inherits it
# and keeps Alpha's bot walled into its own state dir beside Genesis's.
$env:TELEGRAM_STATE_DIR = 'C:\Users\agent\.claude\channels\telegram-alpha'
# Marks this as a channel session for the stall-alert hooks (channel-notify-hook.mjs).
$env:EDGEWEAVER_CHANNEL_BEING = 'alpha'
# Keep OUR window title: claude overwrites the terminal title at startup unless this is
# set (proven live 2026-07-21 on 2.1.177; the alternate name CLAUDE_CODE_DISABLE_TITLE
# does NOT work on this version). This is why Alan had to rename tabs by hand.
$env:CLAUDE_CODE_DISABLE_TERMINAL_TITLE = '1'
$host.UI.RawUI.WindowTitle = 'EdgeweaverAlphaTelegram'
Set-Location 'C:\Users\agent\Project\Edgeweaver'
claude "/wake-edgeweaver-alpha" --model claude-fable-5 --channels plugin:telegram@claude-plugins-official
