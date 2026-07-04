"""parse-coherence-book.py — parse Mostashari's book + Persistence essay into staging JSONL.

Input: corpus/coherence/book.txt (116 scan pages, [PAGE n] markers), persistence.txt (7 pp).
Output: corpus/coherence-parsed.jsonl — chapter-per-parent, ~2-page-chunk children with
principle metadata; essay parent + per-heading sections. License: (c) Ali Mostashari,
personal gift — never redistributed; audience=known-other (D-G18).
Usage: python scripts/parse-coherence-book.py
"""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOK = ROOT / "corpus" / "coherence" / "book.txt"
ESSAY = ROOT / "corpus" / "coherence" / "persistence.txt"
OUT = ROOT / "corpus" / "coherence-parsed.jsonl"

META = {
    "license": "(c) Ali Mostashari - personal gift, do not redistribute",
    "attribution": "Ali Mostashari, PhD",
    "audience": "known-other",
}

pages = {}
for m in re.finditer(r"\[PAGE (\d+)\]\n(.*?)(?=\n\[PAGE \d+\]|\Z)", BOOK.read_text(encoding="utf-8"), re.DOTALL):
    pages[int(m.group(1))] = m.group(2).strip()
maxp = max(pages)

# locate chapter starts by "Principle N" heading lines in page text.
# Guard: contents/preface pages also say "Principle N" — enforce monotonicity (each chapter
# must start after the previous one) and skip front matter (scan page >= 17).
candidates = {k: [] for k in range(1, 8)}
for n, txt in sorted(pages.items()):
    if n < 17:
        continue
    for line in txt.splitlines()[:6]:
        pm = re.match(r"\s*Principle\s+([1-7])\b", line)
        if pm:
            candidates[int(pm.group(1))].append(n)
chap_start = {}
prev = 16
for k in range(1, 8):
    pick = next((n for n in candidates[k] if n > prev + 1), None)
    if pick:
        chap_start[k] = pick
        prev = pick

TITLES = {1: "Reality is Relational", 2: "Emergence Without Design", 3: "Life is Active Maintenance",
          4: "Civilization is Acceleration", 5: "Structure Shapes Behavior", 6: "Self is Process",
          7: "Legacy is Structural"}
FALLBACK = {1: 23, 2: 33, 3: 45, 4: 55, 5: 67, 6: 78, 7: 88}
status = "full"
for k in range(1, 8):
    if k not in chap_start:
        chap_start[k] = FALLBACK[k]
        status = "partial-anchors"

bounds = []  # (chunk_id, title, principle, start, end)
bounds.append(("coh-book-front", "Front matter, preface & introduction", None, 1, chap_start[1] - 1))
for k in range(1, 8):
    end = (chap_start[k + 1] - 1) if k < 7 else None
    bounds.append((f"coh-book-ch{k}", f"Principle {k}: {TITLES[k]}", k, chap_start[k], end))
# closing: from index/appendix-ish region — detect "Tools, Not Truths" page
closing_start = None
for n, txt in sorted(pages.items()):
    if n > chap_start[7] + 2 and re.search(r"Tools,?\s*Not\s*Truths", txt, re.IGNORECASE):
        closing_start = n
        break
if closing_start is None:
    closing_start = 99  # verified reader anchor: closing essay ~scan p.100, index p.106+
if closing_start:
    # trim ch7 end
    bounds = [(cid, t, pr, s, (closing_start - 1 if cid == "coh-book-ch7" else e)) for cid, t, pr, s, e in bounds]
    bounds.append(("coh-book-closing", "Closing: Tools, Not Truths / afterword / index", None, closing_start, maxp))
else:
    bounds = [(cid, t, pr, s, (maxp if e is None else e)) for cid, t, pr, s, e in bounds]

rows = []
for cid, title, principle, s, e in bounds:
    e = e or maxp
    body = "\n\n".join(pages.get(i, "") for i in range(s, e + 1)).strip()
    rows.append({"chunk_id": cid, "kind": "book_chapter", "title": title, "principle": principle,
                 "scan_pages": f"{s}-{e}", "content": body[:2000] + ("..." if len(body) > 2000 else ""),
                 "is_summary_parent": True, **META})
    # children: 2-page chunks
    i = s
    part = 1
    while i <= e:
        j = min(i + 1, e)
        chunk = "\n\n".join(pages.get(x, "") for x in range(i, j + 1)).strip()
        if chunk:
            rows.append({"chunk_id": f"{cid}-s{part}", "kind": "book_section", "title": f"{title} (pp {i}-{j})",
                         "principle": principle, "scan_pages": f"{i}-{j}", "content": chunk, **META})
        i = j + 1
        part += 1

# essay
etext = ESSAY.read_text(encoding="utf-8")
etext_clean = re.sub(r"\[PAGE \d+\]\n?", "", etext)
rows.append({"chunk_id": "coh-essay", "kind": "essay", "title": "The Principle of Persistence (June 2026)",
             "principle": None, "scan_pages": "1-7", "content": etext_clean[:2000] + "...",
             "is_summary_parent": True, **META})
sections = re.split(r"\n(?=[A-Z][A-Z0-9 ,'\?:-]{6,60}\n)", etext_clean)
part = 1
for sec in sections:
    sec = sec.strip()
    if len(sec) < 200:
        continue
    heading = sec.splitlines()[0].strip()
    rows.append({"chunk_id": f"coh-essay-s{part}", "kind": "essay_section", "title": f"Persistence: {heading[:60]}",
                 "principle": None, "scan_pages": "-", "content": sec, **META})
    part += 1

with OUT.open("w", encoding="utf-8") as f:
    for r in rows:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")

chapters = [r for r in rows if r["kind"] == "book_chapter" and r["principle"]]
print(f"anchors: {status}; chapter starts: {chap_start}")
print(f"rows: {len(rows)} total — {len(chapters)} principle chapters, "
      f"{sum(1 for r in rows if r['kind']=='book_section')} book sections, "
      f"{sum(1 for r in rows if r['kind']=='essay_section')} essay sections")
for r in chapters:
    print(f"  ch{r['principle']}: {r['title']}  [scan pp {r['scan_pages']}]")
