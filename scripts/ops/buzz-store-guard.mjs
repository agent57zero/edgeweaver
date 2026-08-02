// Buzz managed-agents store guard (companion to buzz-store-guard.ps1)
//
// The Buzz desktop mints its three default bots (Bumble, Fizz, Honey) fresh for every
// community/relay binding it meets, and the 2026-08-02 MSIX-container launch showed it
// will re-mint them on every start when it sees a redirected (empty-looking) store. By
// 2026-08-02 the store held 14 records for 4 real agents: one set per relay era
// (hosted, ws://localhost:18802, ws://127.0.0.1:18802) plus pubkey-less stubs.
//
// Rule: a record is PRUNED if it has no pubkey (stub), or if its name collides with a
// canonical identity but its pubkey does not (impostor/duplicate, whatever era minted
// it). Records with new names are left alone and only logged, so genuinely new agents
// are never touched. The canonical set is pinned here by pubkey prefix; a deliberate
// fresh mint means editing this file, which is the point.
//
// Never prunes while buzz-desktop.exe or buzz-acp.exe is alive: the desktop holds the
// store in memory and writes it back, so an edit under a running desktop is silently
// lost or races auto_restart_on_config_change. Held prunes are stamped to
// state/buzz-store-dirty.json so the next closed-desktop tick finishes the job.
//
// Every exit path is exit 0 and prints exactly one line for the wrapper's log.

import fs from 'node:fs';
import { execSync } from 'node:child_process';

const STORE = 'C:/Users/agent/AppData/Roaming/xyz.block.buzz.app/agents/managed-agents.json';
const DIRTY = 'C:/Users/agent/Project/Edgeweaver/state/buzz-store-dirty.json';

const CANONICAL = {
  'Bumble': '068c4d5c',
  'Edgeweaver Genesis': 'dea7e846',
  'Fizz': 'a9c027aa',
  'Honey': 'fed67fd9',
};

function out(line) { console.log(line); process.exit(0); }

let arr;
try {
  arr = JSON.parse(fs.readFileSync(STORE, 'utf8'));
} catch (e) {
  out(`STORE-UNREADABLE ${e.message}`);
}
if (!Array.isArray(arr)) out('STORE-NOT-ARRAY refusing to touch it');

const keep = [], prune = [], strangers = [];
for (const r of arr) {
  const tag = `${r.name}:${r.pubkey ? r.pubkey.slice(0, 8) : 'nopubkey'}`;
  if (!r.pubkey) { prune.push({ r, tag, why: 'stub' }); continue; }
  const want = CANONICAL[r.name];
  if (want === undefined) { keep.push(r); strangers.push(tag); continue; }
  if (r.pubkey.startsWith(want)) keep.push(r);
  else prune.push({ r, tag, why: 'impostor' });
}

const strangerNote = strangers.length ? ` strangers-kept=${strangers.join(',')}` : '';

if (prune.length === 0) {
  try { fs.unlinkSync(DIRTY); } catch {}
  out(`CLEAN ${arr.length} records${strangerNote}`);
}

// tasklist check immediately before the write keeps the race window to seconds. The
// wrapper checked too, but the wrapper's check is minutes old by the time node runs
// on a slow tick.
let running = '';
try {
  const tl = execSync('tasklist /FI "IMAGENAME eq buzz-desktop.exe" /FI "STATUS eq running" & tasklist /FI "IMAGENAME eq buzz-acp.exe"', { encoding: 'utf8' });
  if (tl.includes('buzz-desktop.exe')) running = 'buzz-desktop';
  else if (tl.includes('buzz-acp.exe')) running = 'buzz-acp';
} catch {}

const pruneList = prune.map(p => `${p.tag}(${p.why})`).join(',');

if (running) {
  const stamp = { at: new Date().toISOString(), held_because: running, would_prune: prune.map(p => p.tag) };
  try { fs.writeFileSync(DIRTY, JSON.stringify(stamp, null, 2) + '\n'); } catch {}
  out(`DIRTY-HELD ${prune.length} prunable but ${running} is running: ${pruneList}`);
}

const bak = STORE + '.bak-guard-' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
fs.copyFileSync(STORE, bak);
fs.writeFileSync(STORE, JSON.stringify(keep, null, 2) + '\n');
try { fs.unlinkSync(DIRTY); } catch {}
out(`PRUNED ${prune.length} of ${arr.length}: ${pruneList} kept=${keep.length}${strangerNote} backup=${bak.split('/').pop()}`);
