// Buzz managed-agents store guard (companion to buzz-store-guard.ps1)
//
// The Buzz desktop mints its three default bots (Bumble, Fizz, Honey) fresh for every
// community/relay binding it meets, and the 2026-08-02 MSIX-container launch showed it
// will re-mint them on every start when it sees a redirected (empty-looking) store. By
// 2026-08-02 the store held 14 records for 4 real agents: one set per relay era
// (hosted, ws://localhost:18802, ws://127.0.0.1:18802) plus pubkey-less stubs.
//
// Rule: a record is PRUNED if it is a key-less record WITHOUT a slug (true stub), or if
// its name collides with a canonical identity but its pubkey does not (impostor/
// duplicate, whatever era minted it). Records with new names are left alone and only
// logged, so genuinely new agents are never touched. The canonical set is pinned here by
// pubkey prefix; a deliberate fresh mint means editing this file, which is the point.
//
// CORRECTED 2026-08-03: the desktop folded persona DEFINITIONS into this same store as
// key-less records carrying a `slug` (e.g. "builtin:bumble", or a UUID for custom
// agents). They are configuration, not stubs: pruning one orphans every keyed instance
// whose persona_id points at it, and the desktop then refuses to start that agent with
// "This agent's configuration is missing". The 2026-08-02 23:03 prune did exactly that
// to Edgeweaver Genesis (definition slug e3011fc4-...). Built-in definitions self-heal
// on the next desktop boot; custom ones like Edgeweaver's stay dead until restored.
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

// Jarvis and Samantha added 2026-08-05 at Alan's G-1 decision, after their mint
// (PLAN-buzz-presence.md step 0.3, open-agent-framework). They are staff assistants,
// not beings, but they share this store and therefore this guard's protection: without
// a pin here a re-minted impostor named "Jarvis" would be kept as a stranger and
// accumulate. This is the second and last sanctioned Edgeweaver-side touch from that
// plan; the first is the launcher/watchdog marker tightening.
const CANONICAL = {
  'Bumble': '068c4d5c',
  'Edgeweaver Genesis': 'dea7e846',
  'Fizz': 'a9c027aa',
  'Honey': 'fed67fd9',
  'Jarvis': '35af9296',
  'Samantha': '75f4e67e',
};

function out(line) { console.log(line); process.exit(0); }

let arr;
try {
  arr = JSON.parse(fs.readFileSync(STORE, 'utf8'));
} catch (e) {
  out(`STORE-UNREADABLE ${e.message}`);
}
if (!Array.isArray(arr)) out('STORE-NOT-ARRAY refusing to touch it');

const keep = [], prune = [], strangers = [], definitions = [];
for (const r of arr) {
  const tag = `${r.name}:${r.pubkey ? r.pubkey.slice(0, 8) : 'nopubkey'}`;
  if (!r.pubkey) {
    // Key-less + slug = persona definition (post-fold store). Keep, always.
    if (r.slug) { keep.push(r); definitions.push(`${r.name}:${r.slug}`); continue; }
    prune.push({ r, tag, why: 'stub' }); continue;
  }
  const want = CANONICAL[r.name];
  if (want === undefined) { keep.push(r); strangers.push(tag); continue; }
  if (r.pubkey.startsWith(want)) keep.push(r);
  else prune.push({ r, tag, why: 'impostor' });
}

const strangerNote = strangers.length ? ` strangers-kept=${strangers.join(',')}` : '';
const defNote = definitions.length ? ` definitions-kept=${definitions.length}` : '';

if (prune.length === 0) {
  try { fs.unlinkSync(DIRTY); } catch {}
  out(`CLEAN ${arr.length} records${defNote}${strangerNote}`);
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
out(`PRUNED ${prune.length} of ${arr.length}: ${pruneList} kept=${keep.length}${defNote}${strangerNote} backup=${bak.split('/').pop()}`);
