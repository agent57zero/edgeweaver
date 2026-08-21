// Local runner for the Genesis dashboard: mirrors Vercel's shape (middleware in
// front of static files and api functions) so the gate and the queries verify
// against the real brain before any deploy. Dev-only; never deployed (Vercel
// serves public/ and builds api/ only).
//
//   node tools/genesis-dashboard/dev.mjs   ->  http://localhost:8876
//
// Reads SUPABASE_DB_URL from the repo root .env.local (Genesis's brain is the
// OB1 instance, G1). The gate password is a fixed local-only value (below) so
// the browser flow can be exercised; the insecure-cookie knob exists because
// __Host- cookies need https.
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import middleware from "./middleware.js";

const ROOT = import.meta.dirname;
const env = Object.fromEntries(
  readFileSync(join(ROOT, "..", "..", ".env.local"), "utf8")
    .split(/\r?\n/).map((l) => l.match(/^([A-Za-z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]])
);
if (!env.SUPABASE_DB_URL) throw new Error("SUPABASE_DB_URL missing from .env.local");
process.env.EW_GENESIS_DB_URL = env.SUPABASE_DB_URL;
process.env.GENESIS_DASH_PASSWORD = "genesis-local-dev-gate-pass";
process.env.GENESIS_DASH_DEV_INSECURE_COOKIE = "1";

if (env.EW_FISHBOWL_NAMES_GENESIS) process.env.EW_FISHBOWL_NAMES = env.EW_FISHBOWL_NAMES_GENESIS;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".m4a": "audio/mp4",
  ".json": "application/json",
};
const handlers = {
  "/api/thoughts": (await import("./api/thoughts.mjs")).default,
  "/api/lessons": (await import("./api/lessons.mjs")).default,
  "/api/summary": (await import("./api/summary.mjs")).default,
  "/api/days": (await import("./api/days.mjs")).default,
  "/api/fishbowl": (await import("./api/fishbowl.mjs")).default,
};
const PUB = join(ROOT, "public");

createServer(async (req, res) => {
  try {
    const url = `http://localhost:8876${req.url}`;
    let body;
    if (req.method === "POST") {
      const chunks = [];
      for await (const ch of req) chunks.push(ch);
      body = Buffer.concat(chunks);
    }
    const request = new Request(url, { method: req.method, headers: req.headers, body });
    const verdict = await middleware(request);
    if (verdict instanceof Response) {
      res.statusCode = verdict.status;
      verdict.headers.forEach((v, k) => res.setHeader(k, v));
      res.end(Buffer.from(await verdict.arrayBuffer()));
      return;
    }
    let path = new URL(url).pathname;
    if (path === "/fishbowl") path = "/fishbowl.html"; // mirrors the vercel.json rewrite
    if (handlers[path]) return handlers[path](req, res);
    const file = normalize(join(PUB, path === "/" ? "index.html" : path.slice(1)));
    if (!file.startsWith(PUB)) { res.statusCode = 403; return res.end(); }
    if (!existsSync(file)) { res.statusCode = 404; return res.end("not found"); }
    res.setHeader("content-type", MIME[extname(file)] || "application/octet-stream");
    res.end(readFileSync(file));
  } catch (err) {
    console.error("dev server error:", err);
    res.statusCode = 500;
    res.end("dev server error");
  }
}).listen(8876, () => {
  console.log("genesis-dashboard dev on http://localhost:8876 (password: genesis-local-dev-gate-pass)");
});
