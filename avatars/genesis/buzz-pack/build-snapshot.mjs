#!/usr/bin/env node
// Regenerate the Buzz agent snapshot from the persona markdown.
//
// Buzz desktop 0.5.3 rejects legacy .persona.md imports (the import path's
// LEGACY_PERSONA_FILE_SUFFIXES) and accepts buzz-agent-snapshot v1 instead.
// The persona markdown stays the source of truth for the body; this script
// carries it into the snapshot's systemPrompt so the two never drift.
//
// Run after any edit to agents/edgeweaver-genesis.persona.md:
//   node avatars/genesis/buzz-pack/build-snapshot.mjs
//
// Model is deliberately left unset: it is Alan's pick at import time.

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const packDir = dirname(fileURLToPath(import.meta.url));
const personaPath = join(packDir, "agents", "edgeweaver-genesis.persona.md");
const outPath = join(packDir, "agents", "edgeweaver-genesis.agent.json");

const raw = readFileSync(personaPath, "utf8");
const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
if (!match) {
  throw new Error(`No YAML frontmatter found in ${personaPath}`);
}
const [, frontmatter, body] = match;

const field = (key) => {
  const hit = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return hit ? hit[1].trim().replace(/^["']|["']$/g, "") : undefined;
};

const displayName = field("display_name") ?? field("name");
const about = field("description");
const systemPrompt = body.trim();

if (!displayName) throw new Error("persona frontmatter has no display_name or name");
if (!systemPrompt) throw new Error("persona body is empty");
if (systemPrompt.includes("—")) {
  throw new Error("persona body contains an em-dash; the voice rule forbids them");
}

const snapshot = {
  format: "buzz-agent-snapshot",
  version: 1,
  definition: {
    name: displayName,
    sourceIsBuiltin: false,
    systemPrompt,
    runtime: "claude",
    respondTo: "owner-only",
  },
  profile: {
    displayName,
    ...(about ? { about } : {}),
  },
  memory: { level: "none" },
};

writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(
  `wrote ${outPath}\n  displayName: ${displayName}\n  runtime: ${snapshot.definition.runtime}` +
    `\n  respondTo: ${snapshot.definition.respondTo}\n  systemPrompt: ${systemPrompt.length} chars` +
    `\n  model: unset (Alan picks at import)\n  memory: none`,
);
