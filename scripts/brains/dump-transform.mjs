// dump-transform.mjs - data-safe schema rewrite for FULL nightly brain dumps (D17 / BRAINS.md
// section 7, "past-brain spawn"). The nightly backups are plain-SQL pg_dump output of the whole
// database (schema DDL + COPY data), decrypted with Alan's age key before this ever runs.
// transformDumpSql rewrites the DDL to a scratch schema so a past brain can be opened in the
// lab, dark - reusing sql-gen's rewriteDdl so the DDL POLICY is IDENTICAL to the live-copy spawn
// path (extensions stripped, public -> target, pgvector prefix families kept at their extension
// schema, function search_path pins re-pinned, the dump's own CREATE SCHEMA made idempotent).
//
// THE SHARP EDGE: the rewrite must NEVER touch a data line. A memory whose content contains the
// literal string "public.thoughts" (or "CREATE POLICY", or "SCHEMA public", or a tab) must land
// in the scratch BYTE-IDENTICAL. So the dump is SEGMENTED: a COPY header line opens a DATA BLOCK
// that runs until a line whose entire content is "\." (backslash-dot); every byte inside - the
// data rows and the terminator line - is copied through untouched. Only DDL segments and the
// COPY header line ITSELF get rewriteDdl (the header's "public.<table>" becomes the scratch
// schema; the rows below it do not). Segmentation preserves each physical line's exact EOL bytes
// (\n, \r\n, or none at EOF) so data is truly identical; DDL segments inherit transformDdl's
// CRLF->LF normalization, which is harmless for SQL text. This byte-identity is fixture-pinned in
// verify-dump-spawn.mjs (a data row carrying the literal "public.thoughts CREATE POLICY SCHEMA
// public" must survive verbatim).
//
// Extra strips (via rewriteDdl's stripDumpMeta, DDL segments only): OWNER TO / \connect /
// CREATE-DROP DATABASE. A full-database dump may carry these; the lab's roles and database name
// differ, so applying them would fail. Assumption pinned by the fixture: pg_dump emits each on a
// single physical line (true for OWNER TO, \connect; true for CREATE/DROP DATABASE in practice).
import { rewriteDdl, quoteIdent } from "./sql-gen.mjs";

// A COPY data-block OPENER exactly as pg_dump emits it: COPY <qualified table> (<columns>) FROM
// stdin; on one physical line. Requiring the parenthesized column list keeps this from matching
// arbitrary prose (or a function-body line that merely mentions COPY) and mis-opening a data
// block - a false open would swallow real DDL as "data".
const COPY_HEADER = /^COPY\s+[^\s(]+\s*\([^)]*\)\s+FROM\s+stdin;\s*$/;
// The data-block terminator: a line whose entire content is a backslash followed by a dot. Real
// data containing a backslash is escaped (doubled) by pg_dump, so a bare "\." is unambiguous.
const DATA_END = "\\.";

// Split into [content, sep, content, sep, ..., lastContent], preserving each EOL exactly, so
// join("") reproduces the input byte-for-byte. Even indices are line contents (EOL stripped),
// odd indices are the exact EOL bytes (\r\n | \n | \r) that followed that line.
function splitKeepingEol(text) {
  return text.split(/(\r\n|\n|\r)/);
}

// Rewrite a full plain-SQL dump for the target scratch schema, data untouched. opts flow through
// to rewriteDdl (extTypes, extSchema); stripDumpMeta is forced on for dumps.
export function transformDumpSql(dumpText, targetSchema, opts = {}) {
  const ropts = { ...opts, stripDumpMeta: true };
  const parts = splitKeepingEol(dumpText);
  const out = [];
  let ddlBuf = "";        // raw DDL text (content+EOL) accumulating for ONE rewriteDdl pass
  let inData = false;

  const flushDdl = () => {
    if (ddlBuf === "") return;
    out.push(rewriteDdl(ddlBuf, targetSchema, ropts));
    ddlBuf = "";
  };

  for (let i = 0; i < parts.length; i += 2) {
    const content = parts[i];
    const sep = parts[i + 1] || ""; // undefined on the final content chunk -> no trailing EOL
    if (inData) {
      out.push(content + sep);                        // BYTE-IDENTICAL: data row or "\." line
      if (content === DATA_END) inData = false;
      continue;
    }
    if (COPY_HEADER.test(content)) {
      flushDdl();                                     // close the DDL segment before the data
      out.push(rewriteDdl(content, targetSchema, ropts) + sep); // header schema-rewritten, EOL kept
      inData = true;
      continue;
    }
    ddlBuf += content + sep;                           // accumulate a DDL line for one pass
  }
  flushDdl();

  return "CREATE SCHEMA IF NOT EXISTS " + quoteIdent(targetSchema) + ";\n\n" + out.join("");
}
