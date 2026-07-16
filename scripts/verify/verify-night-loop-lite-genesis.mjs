// Hermetic verification of the reconstructed Genesis lite adapter and installable template.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  lessonWriteback, parseOrientation, runSteps, thoughtMetadata, validateBundle, validateCurrentStatus,
} from "../night-loop/lite-live.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const fails = [];
const check = (ok, message) => { if (!ok) fails.push(message); };
const rejects = (fn, message) => { try { fn(); fails.push(message); } catch { /* expected */ } };

const orientText = [
  "diary-day: 2026-07-15",
  "utc-window: 2026-07-15T04:00:00.000Z .. 2026-07-16T04:00:00.000Z",
  "run-id: nl-2026-07-15",
].join("\n");
const orientation = parseOrientation(orientText);
check(orientation.run_id === "nl-2026-07-15" && orientation.utc_start.endsWith("04:00:00.000Z"), "orientation was not parsed verbatim");
rejects(() => parseOrientation(orientText.replace("nl-2026-07-15", "nl-2026-07-14")), "mismatched run-id was accepted");

const valid = {
  diary_day: orientation.diary_day,
  utc_window: orientation.utc_window,
  run_id: orientation.run_id,
  lessons: [{ content: "Alan prefers evidence to ornament.", evidence_ids: ["ep-1"], confidence: 0.8 }],
  diary: "2026-07-15 I recorded one grounded exchange.",
  autobiography_draft: "2026-07-15 Provisional: one exchange emphasized grounded evidence.",
};
validateBundle(valid, orientation, ["ep-1"]);
rejects(() => validateBundle({ ...valid, run_id: "nl-2026-07-14" }, orientation, ["ep-1"]), "altered bundle run-id was accepted");
rejects(() => validateBundle({ ...valid, lessons: [{ ...valid.lessons[0], evidence_ids: ["outside"] }] }, orientation, ["ep-1"]), "out-of-window evidence was accepted");
rejects(() => validateBundle({ ...valid, lessons: [{ ...valid.lessons[0], content: "Perhaps this is durable." }] }, orientation, ["ep-1"]), "speculative lesson was accepted");
rejects(() => validateBundle({ ...valid, diary: "Wrong date" }, orientation, ["ep-1"]), "undated diary was accepted");
rejects(() => validateBundle({ ...valid, lessons: Array(6).fill(valid.lessons[0]) }, orientation, ["ep-1"]), "more than five lessons were accepted");
rejects(() => validateBundle({ ...valid, diary: `2026-07-15 ${Array(249).fill("word").join(" ")}` }, orientation, ["ep-1"]), "250-word diary was accepted");
rejects(() => validateBundle({ ...valid, autobiography_draft: `2026-07-15 ${Array(399).fill("word").join(" ")}` }, orientation, ["ep-1"]), "400-word autobiography was accepted");

const metadata = thoughtMetadata(valid.run_id, "diary");
check(metadata.era === "alive" && metadata.generation === 0 && metadata.audience === "alan"
  && metadata.provenance_class === "interpretation" && metadata.night_loop_run_id === valid.run_id
  && metadata.step === "diary" && !Object.hasOwn(metadata, "rehearsal"), "thought metadata violates live conventions");

const wb = lessonWriteback(valid, valid.lessons[0], 0);
check(wb.schema_version === "openbrain.agent_memory.writeback.v1"
  && wb.idempotency_key === "nl-2026-07-15:consolidate:0"
  && wb.provenance.default_status === "generated" && wb.provenance.requires_review === true
  && wb.source_refs[0].uri === "ob1://thoughts/ep-1", "lesson writeback does not match the review-gated API schema");

const statusThoughts = [
  { source_type: "diary", content: valid.diary, metadata: thoughtMetadata(valid.run_id, "diary") },
  { source_type: "autobiography_draft", content: valid.autobiography_draft, metadata: thoughtMetadata(valid.run_id, "autobiography", { provisional: true }) },
];
const statusLessons = [{ provenance_status: "generated", review_status: "pending", requires_user_confirmation: true, can_use_as_instruction: false }];
check(validateCurrentStatus(statusThoughts, statusLessons, orientation).candidate_lessons === 1, "valid current-run status did not pass");
rejects(() => validateCurrentStatus(statusThoughts.slice(0, 1), statusLessons, orientation), "status accepted a missing autobiography");
rejects(() => validateCurrentStatus(statusThoughts, [{ ...statusLessons[0], review_status: "confirmed" }], orientation), "status accepted a non-pending lesson");
rejects(() => validateCurrentStatus([...statusThoughts, statusThoughts[0]], statusLessons, orientation), "status accepted a duplicate diary");

const calls = [];
const results = await runSteps(valid, {
  lessonExists: async () => false,
  writeLesson: async () => { calls.push("lesson"); throw new Error("injected lesson failure"); },
  thoughtExists: async (_runId, step) => { calls.push(`exists:${step}`); return false; },
  writeThought: async (row) => { calls.push(`write:${row.metadata.step}`); },
});
check(Boolean(results.consolidate.error), "injected consolidate failure was not logged as a step failure");
check(calls.includes("write:diary") && calls.includes("write:autobiography"), "independent steps did not continue after a failure");

const template = await readFile(join(ROOT, "templates", "night-loop-lite-genesis-SKILL.md"), "utf8");
const helper = await readFile(join(ROOT, "scripts", "night-loop", "lite-live.mjs"), "utf8");
const runner = await readFile(join(ROOT, "scripts", "night-loop", "run-genesis-lite.ps1"), "utf8");
const handoff = await readFile(join(ROOT, "docs", "night-loop-lite-genesis-runtime-host.md"), "utf8");
for (const required of [
  "steps 1, 9, and 10", "orient.mjs --diary-day --being genesis", "/functions/v1/agent-memory-api/writeback",
  "Never POST directly to", "manual run never counts", "not a\n> recovered original", "actual runtime host",
]) check(template.includes(required), `template is missing required contract text: ${required}`);
check(!/method:\s*["']POST["'][\s\S]{0,180}rest\(["']agent_memories["']/.test(helper), "helper contains a direct agent_memories POST");
check(helper.includes("agent-memory-api/health") && helper.includes("review_status !== \"pending\""), "helper lacks fail-closed health/review-state checks");
check(helper.includes('command === "status"') && helper.includes("validateCurrentStatus"), "helper lacks the read-only current-run verifier");
check(helper.includes("replace(/\\/+$/, \"\")"), "helper does not normalize a trailing SUPABASE_URL slash");
check(!/--now|nl-rehearsal|era:\s*["']rehearsal/.test(helper), "live helper exposes simulation or rehearsal behavior");
check(!template.includes("C:\\Users\\alan") && !template.includes("C:\\Users\\agent"), "installable template hardcodes a workstation path");
check(!runner.includes("C:\\Users\\") && runner.includes("$PSScriptRoot")
  && runner.includes("-p '/night-loop-lite-genesis'") && runner.includes("--model sonnet")
  && runner.includes("genesis-night.log") && runner.includes("exit $LASTEXITCODE"),
"scheduled runner is not path-neutral or does not pin the skill/model/log/exit code");
check(handoff.includes("New-ScheduledTaskPrincipal") && handoff.includes("-RunLevel Limited")
  && handoff.includes("-WakeToRun") && handoff.includes("-StartWhenAvailable")
  && handoff.includes("-RunOnlyIfNetworkAvailable") && handoff.includes("-MultipleInstances IgnoreNew")
  && handoff.includes("WindowsIdentity]::GetCurrent().Name") && handoff.includes("Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue")
  && !handoff.includes("Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger `\n  -Principal $Principal -Settings $Settings -Description 'Edgeweaver Genesis night-loop-lite steps 1, 9, and 10' -Force")
  && handoff.includes("lite-live.mjs status") && handoff.includes("not scheduled night one")
  && handoff.includes("two distinct real scheduled"), "runtime-host handoff is missing preflight, scheduler, no-overwrite, or two-night safeguards");

if (fails.length) { console.log("FAIL:\n - " + fails.join("\n - ")); process.exit(1); }
console.log("PASS: reconstructed night-loop-lite-genesis is portable and limited to steps 1/9/10; trusts orient verbatim; validates dates/evidence; uses review-gated API writeback; emits live interpretation metadata; is idempotent by run+step; and continues independent steps after failure.");
