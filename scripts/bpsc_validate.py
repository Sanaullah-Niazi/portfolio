"""Checks the BPSC question banks in _data/bpsc/ (FR-60 to FR-63). Run by .github/workflows/bpsc-check.yml on every
pull request that touches _data/bpsc/, and by hand with:  python3 scripts/bpsc_validate.py [--base origin/main]

It fails (exit code 1) on:
- broken YAML, an unknown bank or category, a missing required field or a wrong value
- a duplicate id, or an id that exists on the base branch but is gone now (ids are never changed or reused:
  set status: draft to hide an item instead)
- a published fact item without sources, if it was added after the first import (older ones only warn)
- a published item with a "[Check]" note
- a published item containing a word from the private list in the BPSC_BLOCKED_TERMS secret (one term per line, or
  separated by commas). The list is a secret because the repository is public.
It warns when a check_again item was last verified more than 30 days ago.
Needs PyYAML (pip install pyyaml).
"""
import datetime as dt
import os
import re
import subprocess
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "_data" / "bpsc"
# Items added up to this date came from the first import (BPSC_Interview_Banks.zip), which has no sources yet.
FIRST_IMPORT = dt.date(2026, 11, 25)
REQUIRED = ["id", "bank", "category", "question", "frequency", "verified_on", "status", "added"]
ID_RE = re.compile(r"^[a-z]{2,5}-\d{3,}$")

errors, warnings = [], []


def day(v):
    if isinstance(v, dt.date):
        return v
    try:
        return dt.date.fromisoformat(str(v))
    except ValueError:
        return None


def load(text, name):
    try:
        return yaml.safe_load(text) or []
    except yaml.YAMLError as e:
        errors.append(f"{name}: broken YAML: {e}")
        return []


def base_ids(base, files):
    ids = set()
    for f in files:
        rel = f.relative_to(ROOT).as_posix()
        out = subprocess.run(["git", "show", f"{base}:{rel}"], cwd=ROOT, capture_output=True, text=True)
        if out.returncode == 0:
            for it in load(out.stdout, f"{base}:{rel}") or []:
                if isinstance(it, dict) and it.get("id"):
                    ids.add(str(it["id"]))
    return ids


def text_of(it):
    parts = []
    for v in it.values():
        if isinstance(v, list):
            parts += [str(x) for x in v]
        elif v is not None:
            parts.append(str(v))
    return "\n".join(parts)


def main():
    base = None
    if "--base" in sys.argv:
        base = sys.argv[sys.argv.index("--base") + 1]
    banks = load((DATA / "banks.yml").read_text(encoding="utf-8"), "banks.yml")
    cats = {b["slug"]: set(b.get("categories") or []) for b in banks}
    blocked = [t.strip().lower() for t in re.split(r"[\n,]", os.environ.get("BPSC_BLOCKED_TERMS", "")) if t.strip()]
    if not blocked:
        warnings.append("BPSC_BLOCKED_TERMS is not set, so the private word list was not checked.")
    today = dt.date.today()
    seen = {}
    files = [DATA / f"{s}.yml" for s in cats]
    for f in files:
        if not f.exists():
            errors.append(f"{f.name}: missing (every bank in banks.yml needs its file)")
            continue
        items = load(f.read_text(encoding="utf-8"), f.name)
        if not isinstance(items, list):
            errors.append(f"{f.name}: must be a list of items")
            continue
        slug = f.stem
        for n, it in enumerate(items, 1):
            where = f"{f.name} item {n}"
            if not isinstance(it, dict):
                errors.append(f"{where}: not an item")
                continue
            iid = str(it.get("id", ""))
            where = f"{f.name} {iid or f'item {n}'}"
            for k in REQUIRED:
                if it.get(k) in (None, ""):
                    errors.append(f"{where}: missing {k}")
            if iid and not ID_RE.match(iid):
                errors.append(f"{where}: id should look like isl-042 (letters, a dash, at least 3 digits)")
            if iid in seen:
                errors.append(f"{where}: duplicate id, also in {seen[iid]}")
            seen[iid] = f.name
            if it.get("bank") != slug:
                errors.append(f"{where}: bank is {it.get('bank')!r} but the item is in {f.name}")
            if it.get("category") not in cats.get(slug, set()):
                errors.append(f"{where}: category {it.get('category')!r} is not listed for {slug} in banks.yml")
            if it.get("status") not in ("published", "draft"):
                errors.append(f"{where}: status must be published or draft")
            if it.get("frequency") not in (1, 2, 3):
                errors.append(f"{where}: frequency must be 1, 2 or 3")
            for k in ("verified_on", "added"):
                if it.get(k) not in (None, "") and day(it.get(k)) is None:
                    errors.append(f"{where}: {k} must be a date like 2026-11-25")
            for k in ("tags", "asked_in", "sources"):
                if it.get(k) is not None and not isinstance(it.get(k), list):
                    errors.append(f"{where}: {k} must be a list")
            for s in it.get("sources") or []:
                if not re.match(r"^https?://", str(s)):
                    errors.append(f"{where}: source {s!r} is not a link")
            if it.get("status") != "published":
                continue
            body = text_of(it)
            if "[check]" in body.lower():
                errors.append(f"{where}: has a [Check] note, so it must stay draft until it is checked")
            fact = not it.get("personal") and (it.get("answer") or "").strip()
            if fact and not it.get("sources"):
                added = day(it.get("added"))
                if added and added > FIRST_IMPORT:
                    errors.append(f"{where}: a published answer needs at least one source")
                else:
                    warnings.append(f"{where}: no sources yet (first import)")
            low = body.lower()
            for t in blocked:
                if re.search(r"(?<!\w)" + re.escape(t) + r"(?!\w)", low):
                    errors.append(f"{where}: contains a word from the private list (BPSC_BLOCKED_TERMS)")
                    break
            if re.search(r"\babroad\b", low):
                warnings.append(f"{where}: mentions 'abroad' (NFR-15: no answer about studying or working abroad)")
            v = day(it.get("verified_on"))
            if it.get("check_again") and v and (today - v).days > 30:
                warnings.append(f"{where}: check_again item last verified {v}, more than 30 days ago")
    if base:
        gone = base_ids(base, files) - set(seen)
        for iid in sorted(gone):
            errors.append(f"{iid}: this id is on {base} but is gone now. Ids are never changed or removed; set status: draft instead.")

    no_src = [w for w in warnings if "no sources yet" in w]
    for w in [w for w in warnings if "no sources yet" not in w]:
        print(f"::warning::{w}")
    if no_src:
        print(f"::warning::{len(no_src)} published answers from the first import have no sources yet.")
    for e in errors:
        print(f"::error::{e}")
    print(f"{len(seen)} items checked: {len(errors)} errors, {len(warnings)} warnings.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
