# Edgeweaver Alpha Telegram channel launcher (ASCII only). Run by the watchdog via
# -File: a dedicated script file because Start-Process -Command payloads MANGLE embedded
# quotes (proven 2026-07-16: the env assignment silently failed and the telegram plugin
# fell back to Genesis's state dir, hijacking its poller). -File has no such quoting layer.
# TELEGRAM_STATE_DIR must be set BEFORE claude starts: the plugin's MCP server inherits it
# and keeps Alpha's bot walled into its own state dir beside Genesis's.
$env:TELEGRAM_STATE_DIR = 'C:\Users\agent\.claude\channels\telegram-alpha'
$host.UI.RawUI.WindowTitle = 'EdgeweaverAlphaTelegram'
Set-Location 'C:\Users\agent\Project\Edgeweaver'
claude "/wake-edgeweaver-alpha" --model claude-fable-5 --channels plugin:telegram@claude-plugins-official
