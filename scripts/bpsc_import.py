"""Adds or updates BPSC questions from a CSV file (SRS 6.3), for anyone who prefers a spreadsheet.

The CSV has the same column names as the item fields (see the README, "BPSC interview section"), for example:
  id,bank,category,question,short_answer,answer,frequency,tags,sources,verified_on,status,added
In tags, asked_in and sources, separate several values with |. Empty cells are left out.
A row whose id already exists replaces that item's filled-in fields; a new id is added at the end of its bank's file.
The banks are rewritten with their items in the same order, so check the diff before you commit.

Usage: python3 scripts/bpsc_import.py questions.csv     (then run scripts/bpsc_validate.py)
Needs PyYAML (pip install pyyaml).
"""
import csv
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "_data" / "bpsc"
LISTS = {"tags", "asked_in", "sources"}
INTS = {"frequency"}
BOOLS = {"check_again", "personal"}
ORDER = ["id", "bank", "category", "question", "question_ur", "answer", "answer_ur", "short_answer", "personal",
         "frequency", "tags", "asked_in", "sources", "verified_on", "check_again", "status", "added"]


class Dumper(yaml.SafeDumper):
    pass


def _str(dumper, s):
    style = "|" if "\n" in s else None
    return dumper.represent_scalar("tag:yaml.org,2002:str", s, style=style)


Dumper.add_representer(str, _str)


def value(key, raw):
    raw = raw.strip()
    if key in LISTS:
        return [v.strip() for v in raw.split("|") if v.strip()]
    if key in INTS:
        return int(raw)
    if key in BOOLS:
        return raw.lower() in ("1", "true", "yes", "y")
    return raw


def main(path):
    banks = {}
    header = {}
    for f in DATA.glob("*.yml"):
        if f.stem in ("banks", "settings"):
            continue
        text = f.read_text(encoding="utf-8")
        header[f.stem] = "".join(l for l in text.splitlines(True)[:5] if l.startswith("#")) if text.startswith("#") else ""
        banks[f.stem] = yaml.safe_load(text) or []
    index = {str(it["id"]): it for items in banks.values() for it in items}
    added = updated = 0
    with open(path, newline="", encoding="utf-8-sig") as fh:
        for row in csv.DictReader(fh):
            fields = {k.strip(): value(k.strip(), v) for k, v in row.items() if k and v is not None and v.strip() != ""}
            iid = fields.get("id")
            if not iid:
                print("Skipped a row without an id.")
                continue
            if iid in index:
                index[iid].update(fields)
                updated += 1
            else:
                bank = fields.get("bank")
                if bank not in banks:
                    sys.exit(f"{iid}: unknown bank {bank!r}")
                banks[bank].append(fields)
                index[iid] = fields
                added += 1
    for slug, items in banks.items():
        items = [{k: it[k] for k in ORDER if k in it} | {k: v for k, v in it.items() if k not in ORDER} for it in items]
        out = yaml.dump(items, Dumper=Dumper, allow_unicode=True, sort_keys=False, width=120)
        (DATA / f"{slug}.yml").write_text(header[slug] + out, encoding="utf-8")
    print(f"{added} added, {updated} updated. Now run: python3 scripts/bpsc_validate.py")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
