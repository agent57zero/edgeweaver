// Reconstructed live adapter for /night-loop-lite-genesis.
//
// This adapter is deliberately narrow: it accepts only steps 1, 9, and 10 from
// templates/night-loop-contracts.md. Time comes from orient.mjs, candidate lessons go
// through agent-memory-api, and diary/autobiography thoughts are validated before write.
// It has no rehearsal or date-override mode. Importing this module performs no I/O.

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FLOW_ID = "night-loop-lite-genesis";
const WORKSPACE_ID = "edgeweaver";
const STEP_NAMES = ["consolidate", "diary", "autobiography"];
const SPECULATION = /\b(?:maybe|perhaps|probably|possibly|might|could|seems?|appears?|I think|I guess)\b/i;

function fail(message) { throw new Error(message); }
function words(text) { return text.trim().split(/\s+/).filter(Boolean).length; }

export function parseOrientation(text) {
  const lines = text.replace(/\r/g, "").trim().split("\n");
  if (lines.length !== 3) fail("orientation must contain exactly diary-day, utc-window, and run-id");
  const day = lines[0].match(/^diary-day: (\d{4}-\d{2}-\d{2})$/)?.[1];
  const window = lines[1].match(/^utc-window: (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z) \.\. (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)$/);
  const runId = lines[2].match(/^run-id: (nl-\d{4}-\d{2}-\d{2})$/)?.[1];
  if (!day || !window || !runId) fail("orientation format is invalid");
  if (runId !== `nl-${day}`) fail("orientation run-id does not match diary-day");
  if (!(Date.parse(window[1]) < Date.parse(window[2]))) fail("orientation UTC window is invalid");
  return {
    diary_day: day,
    utc_window: `${window[1]} .. ${window[2]}`,
    utc_start: window[1],
    utc_end: window[2],
    run_id: runId,
  };
}

export function thoughtMetadata(runId, step, extra = {}) {
  if (!STEP_NAMES.includes(step)) fail(`unsupported step: ${step}`);
  return {
    era: "alive",
    generation: 0,
    audience: "alan",
    provenance_class: "interpretation",
    night_loop_run_id: runId,
    run_id: runId,
    step,
    ...extra,
  };
}

function oneSentence(text) {
  if (typeof text !== "string" || !text.trim() || /[\r\n]/.test(text)) return false;
  return (text.trim().match(/[.!?](?=\s|$)/g) || []).length === 1 && /[.!?]$/.test(text.trim());
}

export function validateBundle(bundle, orientation, episodeIds) {
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) fail("bundle must be a JSON object");
  for (const key of ["diary_day", "utc_window", "run_id"]) {
    if (bundle[key] !== orientation[key]) fail(`${key} must be copied verbatim from orient.mjs`);
  }
  const allowed = new Set(episodeIds);
  if (!Array.isArray(bundle.lessons) || bundle.lessons.length > 5) fail("lessons must be an array of 0-5 items");
  bundle.lessons.forEach((lesson, index) => {
    if (!lesson || typeof lesson !== "object") fail(`lesson ${index + 1} must be an object`);
    if (!oneSentence(lesson.content)) fail(`lesson ${index + 1} must be exactly one sentence`);
    if (SPECULATION.test(lesson.content)) fail(`lesson ${index + 1} contains speculative language`);
    if (!Array.isArray(lesson.evidence_ids) || lesson.evidence_ids.length === 0) fail(`lesson ${index + 1} needs evidence thought IDs`);
    if (!lesson.evidence_ids.every((id) => typeof id === "string" && allowed.has(id))) {
      fail(`lesson ${index + 1} cites evidence outside this diary-day window`);
    }
    if (typeof lesson.confidence !== "number" || lesson.confidence < 0 || lesson.confidence > 1) {
      fail(`lesson ${index + 1} confidence must be between 0 and 1`);
    }
  });
  for (const [field, exclusiveWordLimit] of [["diary", 250], ["autobiography_draft", 400]]) {
    const value = bundle[field];
    if (typeof value !== "string" || !value.startsWith(orientation.diary_day)) {
      fail(`${field} must begin with the human diary date ${orientation.diary_day}`);
    }
    if (words(value) >= exclusiveWordLimit) fail(`${field} must be under ${exclusiveWordLimit} words`);
  }
  return bundle;
}

export function lessonWriteback(bundle, lesson, index) {
  const evidence = [...new Set(lesson.evidence_ids)];
  return {
    schema_version: "openbrain.agent_memory.writeback.v1",
    workspace_id: WORKSPACE_ID,
    task_id: bundle.run_id,
    flow_id: FLOW_ID,
    step_id: "consolidate",
    idempotency_key: `${bundle.run_id}:consolidate:${index}`,
    channel: { kind: "night_loop", id: "genesis" },
    runtime: { name: "claude-code", version: null },
    models_used: [{ provider: "anthropic", model: "claude-sonnet", role: "generator" }],
    source_refs: evidence.map((id) => ({ kind: "thought", uri: `ob1://thoughts/${id}`, title: "diary-day episode" })),
    memory_payload: {
      decisions: [], outputs: [], constraints: [], unresolved_questions: [], next_steps: [], failures: [], artifacts: [], entities: {},
      lessons: [`${lesson.content} Evidence thought IDs: ${evidence.join(", ")}. Confidence: ${lesson.confidence}. Generation: 0. Night loop: ${bundle.run_id}.`],
    },
    provenance: { default_status: "generated", confidence: lesson.confidence, requires_review: true },
    retention: {},
    visibility: { workspace: WORKSPACE_ID },
  };
}

export function validateCurrentStatus(thoughts, lessons, orientation) {
  const exact = (sourceType, step) => thoughts.filter((row) => row.source_type === sourceType && row.metadata?.step === step);
  const diary = exact("diary", "diary");
  const autobiography = exact("autobiography_draft", "autobiography");
  if (diary.length !== 1) fail(`current run must have exactly one diary; found ${diary.length}`);
  if (autobiography.length !== 1) fail(`current run must have exactly one provisional autobiography; found ${autobiography.length}`);
  for (const [name, row] of [["diary", diary[0]], ["autobiography", autobiography[0]]]) {
    const metadata = row.metadata || {};
    if (!row.content?.startsWith(orientation.diary_day) || metadata.era !== "alive" || metadata.generation !== 0
        || metadata.audience !== "alan" || metadata.provenance_class !== "interpretation"
        || metadata.night_loop_run_id !== orientation.run_id || metadata.run_id !== orientation.run_id
        || Object.hasOwn(metadata, "rehearsal")) fail(`${name} does not satisfy live metadata/date requirements`);
  }
  if (autobiography[0].metadata.provisional !== true) fail("current autobiography is not marked provisional");
  if (!Array.isArray(lessons) || lessons.length > 5) fail(`current run has invalid candidate lesson count: ${lessons?.length ?? "unknown"}`);
  for (const lesson of lessons) {
    if (lesson.provenance_status !== "generated" || lesson.review_status !== "pending"
        || lesson.requires_user_confirmation !== true || lesson.can_use_as_instruction !== false) {
      fail("a current-run candidate lesson is not generated, pending, and review-required");
    }
  }
  return { diary: 1, autobiography: 1, candidate_lessons: lessons.length };
}

export async function runSteps(bundle, operations, log = () => {}) {
  const results = {};
  const run = async (step, fn) => {
    try { results[step] = await fn(); }
    catch (error) {
      results[step] = { error: error instanceof Error ? error.message : String(error) };
      log(`step ${step} failed: ${results[step].error}`);
    }
  };
  await run("consolidate", async () => {
    let written = 0, skipped = 0;
    for (let i = 0; i < bundle.lessons.length; i++) {
      if (await operations.lessonExists(bundle.run_id, i)) { skipped++; continue; }
      await operations.writeLesson(lessonWriteback(bundle, bundle.lessons[i], i));
      written++;
    }
    return { written, skipped, candidates: bundle.lessons.length };
  });
  await run("diary", async () => {
    if (await operations.thoughtExists(bundle.run_id, "diary")) return { skipped: true };
    await operations.writeThought({ content: bundle.diary, source_type: "diary", metadata: thoughtMetadata(bundle.run_id, "diary") });
    return { written: 1 };
  });
  await run("autobiography", async () => {
    if (await operations.thoughtExists(bundle.run_id, "autobiography")) return { skipped: true };
    await operations.writeThought({
      content: bundle.autobiography_draft,
      source_type: "autobiography_draft",
      metadata: thoughtMetadata(bundle.run_id, "autobiography", { provisional: true }),
    });
    return { written: 1 };
  });
  return results;
}

async function readEnv() {
  const manifest = JSON.parse(await readFile(join(ROOT, "avatars", "genesis", "manifest.json"), "utf8"));
  const envPath = manifest.paths?.envLocal;
  if (!envPath) fail("Genesis envLocal is not armed in the manifest");
  const text = (await readFile(envPath, "utf8")).replace(/^\uFEFF/, "");
  const env = Object.fromEntries(text.split(/\r?\n/).map((line) => line.match(/^([A-Za-z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]));
  for (const key of ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "OB1_MCP_KEY"]) if (!env[key]) fail(`required environment setting is missing: ${key}`);
  if (!/^https:\/\//.test(env.SUPABASE_URL)) fail("SUPABASE_URL must use HTTPS");
  env.SUPABASE_URL = env.SUPABASE_URL.replace(/\/+$/, "");
  return env;
}

function liveOrientation() {
  const output = execFileSync(process.execPath, [join(ROOT, "scripts", "waking", "orient.mjs"), "--diary-day", "--being", "genesis"], { encoding: "utf8" });
  return parseOrientation(output);
}

function headers(env, includeBrainKey = false) {
  return {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...(includeBrainKey ? { "x-brain-key": env.OB1_MCP_KEY } : {}),
  };
}

async function checkedJson(response, operation) {
  if (!response.ok) fail(`${operation} failed with HTTP ${response.status}`);
  try { return await response.json(); }
  catch { fail(`${operation} returned invalid JSON`); }
}

async function assertAgentMemoryApi(env) {
  const response = await fetch(`${env.SUPABASE_URL}/functions/v1/agent-memory-api/health`, { headers: headers(env, true) });
  const body = await checkedJson(response, "agent-memory-api health check");
  if (body?.ok !== true || body?.service !== "agent-memory-api") fail("agent-memory-api health response is not authoritative");
}

async function getEpisodes(env, orientation) {
  const q = new URLSearchParams();
  q.set("select", "id,content,source_type,created_at,metadata");
  q.set("source_type", "eq.edgeweaver_episode");
  q.append("created_at", `gte.${orientation.utc_start}`);
  q.append("created_at", `lt.${orientation.utc_end}`);
  q.set("metadata->>era", "eq.alive");
  q.set("order", "created_at.asc");
  const rows = await checkedJson(await fetch(`${env.SUPABASE_URL}/rest/v1/thoughts?${q}`, { headers: headers(env) }), "episode query");
  return rows
    .filter((row) => row.metadata?.rehearsal !== true && row.metadata?.era === "alive")
    .map((row) => ({ ...row, id: String(row.id) }));
}

function liveOperations(env) {
  const rest = (table, query = "") => `${env.SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ""}`;
  return {
    async lessonExists(runId, index) {
      const q = new URLSearchParams({ select: "id", idempotency_key: `eq.${runId}:consolidate:${index}:0`, limit: "1" });
      return (await checkedJson(await fetch(rest("agent_memories", q), { headers: headers(env) }), "lesson idempotency query")).length > 0;
    },
    async writeLesson(payload) {
      const response = await fetch(`${env.SUPABASE_URL}/functions/v1/agent-memory-api/writeback`, {
        method: "POST", headers: headers(env, true), body: JSON.stringify(payload),
      });
      const body = await checkedJson(response, "agent-memory-api writeback");
      const memory = body?.memories?.[0];
      if (body?.schema_version !== "openbrain.agent_memory.writeback_response.v1" || !memory
          || memory.provenance?.status !== "generated" || memory.use_policy?.requires_user_confirmation !== true
          || memory.use_policy?.can_use_as_instruction !== false) {
        fail("agent-memory-api writeback did not return a generated review-required memory");
      }
      const q = new URLSearchParams({
        select: "review_status,provenance_status,requires_user_confirmation,can_use_as_instruction",
        idempotency_key: `eq.${payload.idempotency_key}:0`, limit: "1",
      });
      const rows = await checkedJson(await fetch(rest("agent_memories", q), { headers: headers(env) }), "lesson review-state verification");
      const row = rows[0];
      if (!row || row.review_status !== "pending" || row.provenance_status !== "generated"
          || row.requires_user_confirmation !== true || row.can_use_as_instruction !== false) {
        fail("candidate lesson did not remain generated, pending, and review-required");
      }
    },
    async thoughtExists(runId, step) {
      const q = new URLSearchParams({ select: "id", "metadata->>night_loop_run_id": `eq.${runId}`, "metadata->>step": `eq.${step}`, limit: "1" });
      return (await checkedJson(await fetch(rest("thoughts", q), { headers: headers(env) }), `${step} idempotency query`)).length > 0;
    },
    async writeThought(record) {
      const rows = await checkedJson(await fetch(rest("thoughts"), {
        method: "POST", headers: { ...headers(env), Prefer: "return=representation" }, body: JSON.stringify(record),
      }), `${record.metadata.step} write`);
      const saved = rows[0];
      if (!saved || saved.source_type !== record.source_type || saved.metadata?.night_loop_run_id !== record.metadata.night_loop_run_id
          || saved.metadata?.step !== record.metadata.step || saved.metadata?.era !== "alive" || saved.metadata?.audience !== "alan"
          || saved.metadata?.generation !== 0 || saved.metadata?.provenance_class !== "interpretation"
          || Object.hasOwn(saved.metadata, "rehearsal")) {
        fail(`${record.metadata.step} write failed post-write validation`);
      }
    },
  };
}

async function currentStatusRows(env, orientation) {
  const thoughtQuery = new URLSearchParams({
    select: "id,content,source_type,metadata",
    "metadata->>night_loop_run_id": `eq.${orientation.run_id}`,
    "source_type": "in.(diary,autobiography_draft)",
  });
  const lessonQuery = new URLSearchParams({
    select: "id,memory_type,provenance_status,review_status,requires_user_confirmation,can_use_as_instruction",
    task_id: `eq.${orientation.run_id}`,
    flow_id: `eq.${FLOW_ID}`,
    memory_type: "eq.lesson",
  });
  const h = headers(env);
  const [thoughts, lessons] = await Promise.all([
    checkedJson(await fetch(`${env.SUPABASE_URL}/rest/v1/thoughts?${thoughtQuery}`, { headers: h }), "current-run thought status query"),
    checkedJson(await fetch(`${env.SUPABASE_URL}/rest/v1/agent_memories?${lessonQuery}`, { headers: h }), "current-run lesson status query"),
  ]);
  return { thoughts, lessons };
}

async function prepare() {
  const orientation = liveOrientation();
  const env = await readEnv();
  await assertAgentMemoryApi(env);
  const episodes = await getEpisodes(env, orientation);
  console.log(JSON.stringify({ ...orientation, episodes }, null, 2));
}

async function commit(inputPath) {
  if (!inputPath) fail("commit requires --input <bundle.json>");
  const orientation = liveOrientation();
  const env = await readEnv();
  await assertAgentMemoryApi(env);
  const episodes = await getEpisodes(env, orientation);
  const bundle = validateBundle(JSON.parse(await readFile(inputPath, "utf8")), orientation, episodes.map((row) => row.id));
  const results = await runSteps(bundle, liveOperations(env), (message) => console.error(message));
  console.log(JSON.stringify({ run_id: bundle.run_id, steps: results }, null, 2));
  if (Object.values(results).some((result) => result.error)) process.exitCode = 1;
}

async function status() {
  const orientation = liveOrientation();
  const env = await readEnv();
  await assertAgentMemoryApi(env);
  const rows = await currentStatusRows(env, orientation);
  const outputs = validateCurrentStatus(rows.thoughts, rows.lessons, orientation);
  console.log(JSON.stringify({ run_id: orientation.run_id, diary_day: orientation.diary_day, ...outputs, verified: true }, null, 2));
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "prepare") return prepare();
  if (command === "commit") return commit(args[args.indexOf("--input") + 1]);
  if (command === "status" || command === "verify-current") return status();
  fail("usage: node scripts/night-loop/lite-live.mjs prepare | commit --input <bundle.json> | status");
}

if (process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === process.argv[1].toLowerCase()) {
  main().catch((error) => { console.error(`night-loop-lite-genesis: ${error.message}`); process.exitCode = 1; });
}
