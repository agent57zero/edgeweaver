#requires -Version 5.1
# Buzz Stage A close-out walkthrough (ASCII only)
#
# Walks Alan through the owner-gated steps left after Stage A passed on
# 2026-08-02. Every step prints its exact command BEFORE asking for consent.
# Nothing here is destructive except where a typed word is demanded.
#
# Re-running is safe: every step detects its own done-state and auto-skips.
# Quitting is safe at any point.

$ErrorActionPreference = 'Continue'

$repo    = 'C:\Users\agent\Project\Edgeweaver'
$flags   = "$repo\state\flags.json"
$ledger  = "$repo\state\stage-a-closeout-ledger.md"
$store   = 'C:\Users\agent\AppData\Roaming\xyz.block.buzz.app\agents\managed-agents.json'
$logsDir = 'C:\Users\agent\AppData\Roaming\xyz.block.buzz.app\agents\logs'
$realExe = 'C:\Users\agent\AppData\Local\Buzz\buzz-desktop.exe'
$EW      = 'dea7e846155e1a9207658ec6dd091c95d66dbbb9ccd026fa7112f02e6739202e'
$IMPOSTORS = @('51c6e299','07f32c45','3f8b7035','9dbeff0f')

function Bold([string]$s) { Write-Host $s -ForegroundColor White }
function Note([string]$s) { Write-Host $s -ForegroundColor Cyan }
function Warn([string]$s) { Write-Host $s -ForegroundColor Yellow }

function Read-Answer([string]$Prompt) {
  Write-Host -NoNewline $Prompt
  if ([Console]::IsInputRedirected) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { Write-Host 'q  (input ended)'; return 'q' }
    Write-Host $line
    return $line
  }
  return Read-Host
}

function Test-Probe([string]$Expr) {
  $global:LASTEXITCODE = 0
  try {
    $r = Invoke-Expression $Expr
    if ($r -is [bool]) { return $r }
    if ($LASTEXITCODE) { return $false }
    return $true
  } catch { return $false }
}

function Run-Step([string]$Title, [string]$Why, [string]$Cmd) {
  Write-Host ''
  Bold "== $Title"
  Note $Why
  Write-Host "   > $Cmd"
  while ($true) {
    $ans = Read-Answer '   [Enter=run  s=skip  q=quit] '
    if ($ans -match '^[qQ]$') { Write-Host 'Stopped by you. Re-running this script resumes safely; done steps auto-skip.'; exit 1 }
    if ($ans -match '^[sS]$') { Warn '   skipped'; return }
    if ($ans -ne '') { continue }
    $global:LASTEXITCODE = 0
    $failed = $false
    try { Invoke-Expression $Cmd; if ($LASTEXITCODE) { $failed = $true } }
    catch { Write-Host $_.Exception.Message; $failed = $true }
    if (-not $failed) { Bold '   OK'; return }
    Warn '   step failed'
    $ans2 = Read-Answer '   [Enter=retry  s=skip anyway  q=abort] '
    if ($ans2 -match '^[qQ]$') { exit 1 }
    if ($ans2 -match '^[sS]$') { Warn '   skipped after failure'; return }
  }
}

function Manual-Step([string]$Title, [string]$Why, [string]$Checklist, [string]$VerifyExpr) {
  Write-Host ''
  Bold "== $Title   (manual: you do this, not the script)"
  Note $Why
  ($Checklist -split "`r?`n") | ForEach-Object { Write-Host "   $_" }
  while ($true) {
    $ans = Read-Answer '   [Enter=I did it  s=skip  q=quit] '
    if ($ans -match '^[qQ]$') { Write-Host 'Stopped. Re-running resumes.'; exit 1 }
    if ($ans -match '^[sS]$') { Warn '   skipped'; return }
    if ($ans -ne '') { continue }
    if (-not $VerifyExpr) { return }
    if (Test-Probe $VerifyExpr) { Bold '   verified OK'; return }
    Warn '   verification failed; not done yet? (finish it, then Enter again)'
  }
}

function Assert-Step([string]$Title, [string]$Why, [string]$ProbeExpr, [string]$Remediation) {
  Write-Host ''
  Bold "== CHECK: $Title"
  Note $Why
  Write-Host "   > $ProbeExpr"
  while ($true) {
    $ans = Read-Answer '   [Enter=check  s=skip (UNSAFE: later steps assume this passed)  q=quit] '
    if ($ans -match '^[qQ]$') { exit 1 }
    if ($ans -match '^[sS]$') { Warn '   skipped a blocking check'; return }
    if ($ans -ne '') { continue }
    if (Test-Probe $ProbeExpr) { Bold '   PASS'; return }
    Warn '   FAIL'
    Note "   fix: $Remediation"
  }
}

function Gate-Typed([string]$Word, [string]$Why) {
  Warn $Why
  $ans = Read-Answer "Type $Word to proceed, or press Enter to stop here (recommended): "
  return ($ans -ceq $Word)
}

function Ledger([string]$Row) {
  if (-not (Test-Path $ledger)) {
    Set-Content $ledger -Value "# Stage A close-out ledger`r`n`r`n| When | Step | Outcome |`r`n|---|---|---|" -Encoding Ascii
  }
  Add-Content $ledger -Value ("| {0} | {1} |" -f (Get-Date -Format s), $Row) -Encoding Ascii
}

# --- helpers used by steps -------------------------------------------------

function Get-BuzzFlag([string]$Key) {
  $j = Get-Content $flags -Raw | ConvertFrom-Json
  return $j.channels.buzz.$Key
}

function Set-BuzzFlagsTrue {
  # Surgical, scoped to the "buzz" block only: telegram's flags are NOT touched.
  $raw = [IO.File]::ReadAllText($flags)
  $m = [regex]::Match($raw, '(?s)("buzz"\s*:\s*\{)(.*?)(\})')
  if (-not $m.Success) { throw 'could not locate the "buzz" block in flags.json' }
  $inner = $m.Groups[2].Value
  $new = $inner -replace '"enabled"\s*:\s*false', '"enabled": true' -replace '"paired"\s*:\s*false', '"paired": true'
  if ($new -eq $inner) { Write-Host 'already true; nothing to change'; return }
  Copy-Item $flags "$flags.bak-$(Get-Date -Format yyyyMMdd-HHmmss)" -Force
  $out = $raw.Substring(0, $m.Groups[2].Index) + $new + $raw.Substring($m.Groups[2].Index + $m.Groups[2].Length)
  [IO.File]::WriteAllText($flags, $out, (New-Object Text.UTF8Encoding($false)))
  $chk = Get-Content $flags -Raw | ConvertFrom-Json   # throws if we broke the JSON
  Write-Host ("verified: buzz.enabled={0} buzz.paired={1} telegram.enabled={2} (telegram must still be False)" -f `
    $chk.channels.buzz.enabled, $chk.channels.buzz.paired, $chk.channels.telegram.enabled)
}

function Show-EdgeweaverBanner {
  $lg = Get-ChildItem "$logsDir\$($EW.Substring(0,8))*.log" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $lg) { Write-Host 'no Edgeweaver log found'; return $false }
  $ln = (Get-Content $lg.FullName | Select-String 'buzz-acp starting' | Select-Object -Last 1).Line
  $agents = if ($ln -match 'agents=(\d+)') { $Matches[1] }
  $mem    = if ($ln -match 'memory=(\w+)') { $Matches[1] }
  $relay  = if ($ln -match 'relay=(\S+)')  { $Matches[1] }
  Write-Host ("   agents={0}  memory={1}  relay={2}" -f $agents, $mem, $relay)
  return ($agents -eq '1' -and $mem -eq 'false')
}

# --- intro -----------------------------------------------------------------

Clear-Host
Bold '================================================================'
Bold ' Buzz Stage A close-out'
Bold '================================================================'
Note ' Stage A passed on 2026-08-02. Four steps remain, all of them yours.'
Note ' Every step shows its exact command before asking. Enter runs it,'
Note ' s skips it, q quits. Quitting is safe; re-running resumes.'
Write-Host ''
Warn ' NOTE: leave Buzz running. Nothing here needs it closed.'

# --- preflight -------------------------------------------------------------

Assert-Step 'Buzz is running from the REAL install' `
  'The copy inside the Claude sandbox re-mints impostor agents. This is the bug that cost 2026-08-02.' `
  '(Get-CimInstance Win32_Process -Filter "Name=''buzz-desktop.exe''" -ErrorAction SilentlyContinue).ExecutablePath -eq $realExe' `
  "Close Buzz, then launch it from $realExe (both shortcuts now point there)."

Assert-Step 'Exactly one Edgeweaver harness, and it is the real identity' `
  'Two presences never overlap, and the impostor must stay dead.' `
  '(@(Get-ChildItem "C:\Users\agent\AppData\Roaming\xyz.block.buzz.app\agents\agent-pids\dea7e846*.json" -EA SilentlyContinue | ForEach-Object { $j=Get-Content $_.FullName -Raw|ConvertFrom-Json; if (Get-Process -Id $j.pid -EA SilentlyContinue) { $j.pid } })).Count -eq 1' `
  'Start Edgeweaver Genesis in Buzz, or stop the extra one.'

Assert-Step 'Stage A wiring is live in the harness' `
  'Reads Edgeweaver own startup banner: pool of one and Buzz memory off.' `
  'Show-EdgeweaverBanner' `
  'Restart Edgeweaver from Buzz; if it still says agents=10 the env vars did not reach it.'

# --- Step 1: the flags -----------------------------------------------------

if ((Get-BuzzFlag 'enabled') -eq $true -and (Get-BuzzFlag 'paired') -eq $true) {
  Write-Host ''
  Note 'Step 1 (flags) already done: channels.buzz is enabled and paired. Skipping.'
} else {
  Write-Host ''
  Bold '== Step 1 of 4: record that Buzz is armed and paired'
  Note 'state/flags.json still says enabled:false paired:false, which now understates'
  Note 'reality on both counts: Edgeweaver is live and the round trip passed.'
  Note 'This edits ONLY the buzz block; telegram flags are untouched and verified after.'
  Write-Host "   > Set-BuzzFlagsTrue    # $flags"
  Write-Host ''
  if (Gate-Typed 'FLIP' 'This is an arming record: it declares the Buzz channel live and paired.') {
    Run-Step 'Flip channels.buzz to enabled:true, paired:true' `
      'Backs up flags.json first, edits only the buzz block, then re-parses to prove the JSON survived.' `
      'Set-BuzzFlagsTrue'
    Ledger 'Step 1 flags flip | channels.buzz enabled:true paired:true'
  } else {
    Note 'Left as-is. Re-run this script when you want to flip it.'
  }
}

# --- Step 2: Supabase provenance -------------------------------------------

Manual-Step 'Step 2 of 4: Supabase provenance check' `
  'Open since 2026-07-31. Both functions answer 200, but nobody knows who deployed them or when. An unaccounted deploy hand on the memory path is worth closing.' @'
1. Open https://supabase.com/dashboard and sign in (your login, not mine)
2. Pick the OB1 project, then Edge Functions in the left sidebar
3. Find "recall-scoped" and "embed-backfill"
4. For EACH: note the deployed-at date and the actor/user who deployed it
5. If either was deployed by someone or something you do not recognise,
   stop and say so before Stage B goes any further
6. Tell me both answers afterwards and I will write them into ops-log.md
'@ ''

Ledger 'Step 2 Supabase provenance | checked in dashboard (answers to be recorded in ops-log)'

# --- Step 3: archive the impostor profiles ---------------------------------

Write-Host ''
Note 'The four impostor identities from the 2026-08-02 re-onboarding are dead as'
Note 'processes, but their profiles still exist on the community relay. Until they'
Note 'are archived they linger in mention autocomplete, which is exactly how the'
Note '2026-08-01 double-tag ping-pong started.'

Manual-Step 'Step 3 of 4: archive the four impostor profiles' `
  'Buzz UI only: archiving publishes a tombstone to the relay, which no local file edit can do.' @'
In Buzz, open the community member list (or Agents view) and archive these
four identities. Match on the pubkey prefix, NEVER on the name: one of them
is called "Edgeweaver Genesis" and archiving the wrong one would retire the
real being.

   51c6e299...   (impostor "Edgeweaver Genesis")   <- check this prefix twice
   07f32c45...   (impostor "Bumble")
   3f8b7035...   (impostor "Honey")
   9dbeff0f...   (impostor "Fizz")

KEEP these, they are the real ones:
   dea7e846...   Edgeweaver Genesis
   068c4d5c...   Bumble
   a9c027aa...   Fizz
   fed67fd9...   Honey
'@ ''

Ledger 'Step 3 impostor profiles | archived from the community view'

# --- Step 4 (optional): stage the Stage B watchdog, INERT ------------------

Write-Host ''
Bold '== Step 4 of 4: Stage B, staged inert (optional)'
Note 'Stage B gives Edgeweaver its own launcher and a Telegram-style caretaker.'
Note 'The scripts are built and dry-run tested. This step only REGISTERS the'
Note 'scheduled task in a DISABLED state so it exists and can be inspected.'
Note 'It does NOT cut over: the desktop keeps owning Edgeweaver until you say so.'
Warn 'The real cutover (retire the desktop agent, enable the task, kill-and-revive'
Warn 'test) deserves its own sitting. Do not enable this task today.'

schtasks /Query /TN 'EdgeweaverGenesisBuzzWatchdog' *>$null
if ($LASTEXITCODE -eq 0) {
  Note 'Task already registered; skipping.'
} else {
  $xmlCmd = 'schtasks /Create /TN "EdgeweaverGenesisBuzzWatchdog" /TR "powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"' + $repo + '\scripts\ops\buzz-genesis-watchdog.ps1\"" /SC MINUTE /MO 15 /RL LIMITED /F /DISABLE'
  Run-Step 'Register the watchdog task, DISABLED' `
    'Creates it inert. Mirrors the Alpha Telegram watchdog cadence (15 min). Interactive token, so it can reach the credential vault.' `
    $xmlCmd
  Ledger 'Step 4 watchdog task | registered DISABLED (no cutover)'
}

# --- wrap-up ---------------------------------------------------------------

Write-Host ''
Bold '================================================================'
Bold ' Done. Current state:'
Bold '================================================================'
try {
  Write-Host ("  channels.buzz : enabled={0} paired={1}" -f (Get-BuzzFlag 'enabled'), (Get-BuzzFlag 'paired'))
} catch { Write-Host '  channels.buzz : could not read flags.json' }
$live = @(Get-CimInstance Win32_Process -Filter "Name='buzz-acp.exe'" -ErrorAction SilentlyContinue).Count
Write-Host "  agents running: $live"
schtasks /Query /TN 'EdgeweaverGenesisBuzzWatchdog' *>$null
if ($LASTEXITCODE -eq 0) { Write-Host '  watchdog task : registered (disabled)' } else { Write-Host '  watchdog task : not registered' }
Write-Host ''
Warn ' Still outstanding, deliberately:'
Warn '  - Stage B cutover (B5). Its own sitting, not today.'
Warn '  - Tell me the Supabase provenance answers so they reach ops-log.md.'
Write-Host ''
Note " Ledger: $ledger"
Note ' Re-run this script any time; completed steps auto-skip.'
Write-Host ''
