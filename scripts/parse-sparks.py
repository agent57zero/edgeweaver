"""parse-sparks.py — parse downloaded SPARK PDFs into staging JSONL (checklist 00, Phase 0b).

Structure per research/possibility-management-corpus.md (verified against Spark-099):
header (SPARK NNN + matrix code) -> DISTINCTION (one bolded sentence) -> NOTES -> EXPERIMENTS
(numbered SPARKNNN.01...). Robust to missing markers: rows carry parse_status so partial
parses are visible, never silently dropped.

Usage: python scripts/parse-sparks.py
Output: corpus/sparks-parsed.jsonl + summary + Spark-099 verification block.
"""
import json, re, sys
from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "corpus" / "sparks"
OUT = ROOT / "corpus" / "sparks-parsed.jsonl"

FOOTER_PAT = re.compile(
    r"World Copyleft.*?Possibility Management|http://sparkexperiments\.org\S*|"
    r"Free weekly Eng SPARKs\S*|Powered by Possibility Management\S*", re.IGNORECASE)

def clean(text: str) -> str:
    text = FOOTER_PAT.sub(" ", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip().lstrip(":.- ").strip()

def parse_pdf(path: Path) -> dict:
    spark_id = re.match(r"Spark-([A-Za-z0-9]+)-en\.pdf", path.name).group(1)
    reader = PdfReader(str(path))
    raw = "\n".join((page.extract_text() or "") for page in reader.pages)
    code_m = re.search(r"SPARK\s*([A-Z0-9]+)\.00", raw)
    base_code = f"SPARK{code_m.group(1)}" if code_m else f"SPARK{spark_id.upper()}"

    def find_marker(name):
        m = re.search(rf"^\s*{name}S?\s*:?\s*$", raw, re.MULTILINE)
        return m.start() if m else raw.find(name)

    d_i, n_i, e_i = find_marker("DISTINCTION"), find_marker("NOTES"), find_marker("EXPERIMENT")
    status = "full"
    distinction = notes = experiments_text = ""
    if 0 <= d_i < n_i < e_i:
        distinction = clean(raw[d_i:n_i].replace("DISTINCTION", "", 1))
        notes = clean(raw[n_i:e_i].replace("NOTES", "", 1))
        experiments_text = raw[e_i:]
    else:
        status = "partial"
        notes = clean(raw)

    experiments = []
    if experiments_text:
        exp_codes = list(re.finditer(rf"{base_code}\.(\d{{2}})", experiments_text))
        exp_codes = [m for m in exp_codes if m.group(1) != "00"]
        for i, m in enumerate(exp_codes):
            end = exp_codes[i + 1].start() if i + 1 < len(exp_codes) else len(experiments_text)
            body = clean(experiments_text[m.end():end])
            if body:
                experiments.append({"code": f"{base_code}.{m.group(1)}", "text": body})
        if not experiments:
            body = clean(re.sub(r"^\s*EXPERIMENTS?\S*", "", experiments_text, count=1))
            if body:
                experiments.append({"code": f"{base_code}.01", "text": body})
                status = "partial" if status == "full" else status

    return {
        "file": path.name, "spark": spark_id, "matrix_code": f"{base_code}.00",
        "distinction": distinction, "notes": notes, "experiments": experiments,
        "parse_status": status,
        "license": "CC-BY-SA-4.0",
        "attribution": "Clinton Callahan / Possibility Management",
        "source_url": f"https://sparks.nextculture.org/res/sparks/{path.name}",
    }

pdfs = sorted(SRC.glob("Spark-*-en.pdf"))
if not pdfs:
    sys.exit("no PDFs found in corpus/sparks — run fetch-sparks.mjs first")

rows, errors = [], []
for p in pdfs:
    try:
        rows.append(parse_pdf(p))
    except Exception as e:  # a corrupt PDF must not kill the batch
        errors.append(f"{p.name}: {e}")

with OUT.open("w", encoding="utf-8") as f:
    for r in rows:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")

full = sum(1 for r in rows if r["parse_status"] == "full")
exp_total = sum(len(r["experiments"]) for r in rows)
print(f"parsed {len(rows)}/{len(pdfs)} PDFs -> {OUT.name}")
print(f"  full parses: {full}, partial: {len(rows) - full}, experiments total: {exp_total}")
if errors:
    print(f"  ERRORS ({len(errors)}):")
    for e in errors[:10]:
        print("   ", e)

v = next((r for r in rows if r["spark"] == "099"), None)
if v:
    print("\n== Spark-099 verification ==")
    print("  matrix_code:", v["matrix_code"], "| status:", v["parse_status"])
    print("  distinction:", (v["distinction"][:160] + "...") if len(v["distinction"]) > 160 else v["distinction"])
    print("  experiments:", [e["code"] for e in v["experiments"]])
else:
    print("WARN: Spark-099 not found for verification")
