// The entire password gate for the Alpha dashboard (Vercel Routing Middleware,
// framework-less project). Adapted from site/middleware.js, the proven D21 gate.
//
// Rules this file enforces by construction:
//   - No route filter is exported, so every path is gated, including /api/*.
//   - FAIL CLOSED: if ALPHA_DASH_PASSWORD is unset, everything is 503.
//   - The password never appears here, in the cookie, or in any tracked file.
//     The cookie carries hex HMAC-SHA256(key = password, message = COOKIE_MSG),
//     so rotating the password kills every outstanding cookie by construction.
//   - The login page is emitted from this middleware (no public login file, no
//     carve-outs, no redirect loops). Team-grade gate, not hard security; the
//     real wall is that the API only ever selects audience=seats rows.
//   - Unauthenticated /api requests get 401 JSON, never the login HTML.
//
// ALPHA_DASH_DEV_INSECURE_COOKIE=1 is set ONLY by dev.mjs (local http): it
// drops the __Host- prefix and the Secure attribute so the cookie works on
// plain http. Production never sets it.

const COOKIE_MSG = "ew-alpha-dash-cookie-v1";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const MIN_PASSWORD_LENGTH = 20;
const SECURITY_HEADERS = {
  "cache-control": "private, no-store",
  "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; media-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), browsing-topics=()",
};

const devInsecure = () => process.env.ALPHA_DASH_DEV_INSECURE_COOKIE === "1";
const cookieName = () => (devInsecure() ? "ew_alpha_dash_dev" : "__Host-ew_alpha_dash");
const cookieAttrs = (maxAge) =>
  `Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax` + (devInsecure() ? "" : "; Secure");

function secureHeaders(extra = {}) {
  return { ...SECURITY_HEADERS, ...extra };
}

async function hmacHex(key, message) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function cookieValue(header, name) {
  if (!header) return null;
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

function safeNext(raw) {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/";
  return raw;
}

function loginPage(next, failed, status) {
  const err = failed ? `<p class="err">That was not the password. Ask Alan for the current one.</p>` : "";
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Edgeweaver Alpha</title>
<style>
:root { color-scheme: light dark; }
body { margin:0; font:16px/1.6 system-ui, "Segoe UI", sans-serif; display:grid; min-height:100vh; place-items:center;
       background:#faf9f6; color:#24313a; }
@media (prefers-color-scheme: dark) { body { background:#101a1e; color:#dde4e2; } }
form { border:1px solid rgba(125,125,125,.35); border-top:4px solid #0f766e; border-radius:10px; padding:22px 26px; max-width:340px; }
h1 { font:700 20px Georgia, serif; margin:0 0 4px; }
p { font-size:13.5px; opacity:.8; margin:6px 0; }
.err { color:#b91c1c; opacity:1; }
input[type=password] { width:100%; font:inherit; padding:8px 10px; border:1px solid rgba(125,125,125,.45); border-radius:8px; background:transparent; color:inherit; }
button { margin-top:10px; width:100%; font:inherit; padding:8px 10px; border:none; border-radius:8px; background:#0f766e; color:#fff; cursor:pointer; }
</style>
</head>
<body>
<form method="post" action="/ew-login">
<h1>Edgeweaver Alpha</h1>
<p>The circle's read-only window into Alpha's room. Enter the shared password.</p>
${err}
<input type="password" name="password" autocomplete="current-password" autofocus aria-label="Password">
<input type="hidden" name="next" value="${next.replace(/"/g, "&quot;")}">
<button type="submit">Enter</button>
</form>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...secureHeaders(),
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

// D45 (2026-08-21, circle unanimous): the fishbowl is the ONE public carve-out.
// Exact paths only, GET only; everything else stays behind the gate. The public
// API endpoint serves only the room's telegram_in/telegram_out rows with seats
// mapped to first names server-side; nothing gated is reachable through it.
const PUBLIC_PATHS = new Set([
  "/fishbowl",
  "/fishbowl.html",
  "/api/fishbowl",
  "/assets/fishbowl.css",
  "/assets/fishbowl.js",
]);

export default async function middleware(request) {
  const publicUrl = new URL(request.url);
  if (PUBLIC_PATHS.has(publicUrl.pathname) && (request.method === "GET" || request.method === "HEAD")) {
    return undefined; // public fishbowl: continue to the static file or api function
  }

  const password = process.env.ALPHA_DASH_PASSWORD;
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return new Response("Dashboard gate not configured (ALPHA_DASH_PASSWORD unset). Failing closed.", {
      status: 503,
      headers: secureHeaders({ "content-type": "text/plain; charset=utf-8" }),
    });
  }

  const expected = await hmacHex(password, COOKIE_MSG);
  const url = new URL(request.url);

  const cookie = cookieValue(request.headers.get("cookie"), cookieName());
  if (cookie && timingSafeEqual(cookie, expected)) {
    if (url.pathname === "/ew-login") {
      return new Response(null, { status: 303, headers: secureHeaders({ location: "/" }) });
    }
    if (url.pathname === "/ew-logout" && request.method === "POST") {
      return new Response(null, {
        status: 303,
        headers: secureHeaders({
          location: "/",
          "set-cookie": `${cookieName()}=; ${cookieAttrs(0)}`,
        }),
      });
    }
    return undefined; // authenticated: continue to the static file or api function
  }

  if (url.pathname === "/ew-login" && request.method === "POST") {
    let candidate = "";
    let next = "/";
    try {
      const form = await request.formData();
      candidate = String(form.get("password") || "");
      next = safeNext(String(form.get("next") || "/"));
    } catch {
      return loginPage("/", true, 400);
    }
    const got = candidate.length >= MIN_PASSWORD_LENGTH ? await hmacHex(candidate, COOKIE_MSG) : "";
    if (candidate.length >= MIN_PASSWORD_LENGTH && timingSafeEqual(got, expected)) {
      return new Response(null, {
        status: 303,
        headers: secureHeaders({
          location: next,
          "set-cookie": `${cookieName()}=${expected}; ${cookieAttrs(MAX_AGE)}`,
        }),
      });
    }
    await new Promise((r) => setTimeout(r, 400));
    return loginPage(next, true, 401);
  }

  if (url.pathname.startsWith("/api/")) {
    return new Response(JSON.stringify({ error: "not signed in" }), {
      status: 401,
      headers: secureHeaders({ "content-type": "application/json; charset=utf-8" }),
    });
  }

  return loginPage(url.pathname + url.search, false, 401);
}
