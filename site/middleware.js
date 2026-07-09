// The entire password gate for the Edgeweaver explainer site (Vercel Routing
// Middleware, framework-less static project). Design: runs/site-plan.md.
//
// Rules this file enforces by construction:
//   - No route filter is exported, so every path is gated; nothing is ever unprotected.
//   - FAIL CLOSED: if EW_SITE_PASSWORD is unset, everything is 503.
//   - The password never appears here, in the cookie, or in any tracked file.
//     The cookie carries hex HMAC-SHA256(key = password, message = COOKIE_MSG),
//     so rotating the password kills every outstanding cookie by construction.
//   - The login page is emitted from this middleware (no public login file, no
//     carve-outs, no redirect loops). Team-grade gate, not hard security: the
//     site contains no secrets by construction and verification.

const COOKIE_NAME = "ew_site_auth";
const COOKIE_MSG = "ew-site-cookie-v1";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

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
<title>How Edgeweaver Works</title>
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
<h1>How Edgeweaver Works</h1>
<p>A field guide for the village. Enter the shared password.</p>
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
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

export default async function middleware(request) {
  const password = process.env.EW_SITE_PASSWORD;
  if (!password) {
    return new Response("Site gate not configured (EW_SITE_PASSWORD unset). Failing closed.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  const expected = await hmacHex(password, COOKIE_MSG);
  const url = new URL(request.url);

  const cookie = cookieValue(request.headers.get("cookie"), COOKIE_NAME);
  if (cookie && timingSafeEqual(cookie, expected)) {
    if (url.pathname === "/ew-login") {
      return new Response(null, { status: 303, headers: { location: "/" } });
    }
    return undefined; // authenticated: continue to the static file
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
    const got = await hmacHex(candidate, COOKIE_MSG);
    if (timingSafeEqual(got, expected)) {
      return new Response(null, {
        status: 303,
        headers: {
          location: next,
          "set-cookie": `${COOKIE_NAME}=${expected}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
          "cache-control": "no-store",
        },
      });
    }
    await new Promise((r) => setTimeout(r, 400));
    return loginPage(next, true, 401);
  }

  return loginPage(url.pathname + url.search, false, 401);
}
