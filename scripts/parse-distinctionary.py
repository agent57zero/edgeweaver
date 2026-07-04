"""parse-distinctionary.py — parse the PM Distinctionary (reader-proxy markdown) to JSONL.

Entry shapes observed in corpus/distinctionary/raw.md:
  [TERM](bubble-url) – definition ... (See: A, B)
  TERM – definition ...
Multi-paragraph entries continue until the next entry line. Nav/menu/image lines never match
the entry pattern. Usage: python scripts/parse-distinctionary.py
"""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "corpus" / "distinctionary" / "raw.md"
OUT = ROOT / "corpus" / "distinctionary-parsed.jsonl"

DASH = r"[–—-]"
LINKED = re.compile(rf"^\[([^\]]+)\]\((https?://[^)]+)\)\s*{DASH}\s*(.+)", re.DOTALL)
PLAIN = re.compile(rf"^([A-Z0-9][A-Z0-9 .,'&/()\+\?!:-]{{2,70}}?)\s*{DASH}\s*(.+)", re.DOTALL)
SEE = re.compile(r"\(See:\s*([^)]+)\)")
MDLINK = re.compile(r"\[([^\]]+)\]\((?:https?|mailto)[^)]*\)")

def strip_links(t: str) -> str:
    return MDLINK.sub(r"\1", t)

lines = RAW.read_text(encoding="utf-8").splitlines()
entries = []
cur = None
for line in lines:
    s = line.strip()
    if not s:
        continue
    if s.startswith(("*   [", "![", "Title:", "URL Source:", "Markdown Content", "===", "---")):
        continue
    m = LINKED.match(s) or PLAIN.match(s)
    is_new = False
    if m:
        term = m.group(1).strip()
        # a real term is (mostly) upper-case and not a sentence fragment
        letters = [c for c in term if c.isalpha()]
        if letters and sum(c.isupper() for c in letters) / len(letters) > 0.8 and len(term) <= 70:
            is_new = True
    if is_new:
        if cur:
            entries.append(cur)
        if m.re is LINKED:
            cur = {"term": m.group(1).strip(), "bubble_url": m.group(2), "definition": m.group(3).strip()}
        else:
            cur = {"term": m.group(1).strip(), "bubble_url": None, "definition": m.group(2).strip()}
    elif cur:
        cur["definition"] += "\n" + s
if cur:
    entries.append(cur)

rows = []
seen = set()
for e in entries:
    term = re.sub(r"\s+", " ", e["term"]).strip()
    if term.lower() in seen:
        continue
    seen.add(term.lower())
    definition = strip_links(e["definition"]).strip()
    if len(definition) < 25:  # nav crumbs / dividers
        continue
    see_also = []
    sm = SEE.search(definition)
    if sm:
        see_also = [x.strip() for x in re.split(r",|;", sm.group(1)) if x.strip() and not x.strip().lower().startswith("read")]
    rows.append({
        "term": term, "definition": definition, "see_also": see_also,
        "bubble_url": e["bubble_url"],
        "license": "CC-BY-SA-4.0",
        "attribution": "Clinton Callahan / Possibility Management",
        "source_url": "https://distinctionary.mystrikingly.com/",
    })

with OUT.open("w", encoding="utf-8") as f:
    for r in rows:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")

print(f"parsed {len(rows)} distinction entries -> {OUT.name}")
g = next((r for r in rows if r["term"] == "GREMLIN"), None)
print("\n== GREMLIN verification ==")
if g:
    print("  starts:", g["definition"][:90], "...")
    print("  contains 'Archetypal King or Queen':", "Archetypal King or Queen" in g["definition"])
    print("  see_also count:", len(g["see_also"]))
else:
    print("  NOT FOUND — inspect parser")
cross = sum(1 for r in rows if r["see_also"])
print(f"  entries with cross-refs: {cross}/{len(rows)}")
