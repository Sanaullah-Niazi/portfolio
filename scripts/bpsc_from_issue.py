"""Turns an approved submission (an issue in the private Sanaullah-Niazi/bpsc-submissions repository) into a change
to the BPSC banks, for a pull request in this repository (FR-54). Run by that repository's "Approve" workflow
(templates/bpsc-submissions/.github/workflows/approve.yml), or by hand:

    python3 scripts/bpsc_from_issue.py issue.json     (issue.json: the issue as the GitHub API returns it)

- New question or interview report: a new item at the end of its bank, with the next free id.
- Better answer or correction with a question id: that item's answer is replaced and verified_on set to today.
The item is written as published, because merging the pull request is the approval: sana reads the exact text there.
It prints a summary in Markdown for the pull request body. Run scripts/bpsc_validate.py afterwards.
Needs PyYAML.
"""
import datetime as dt
import json
import re
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from bpsc_import import Dumper, ORDER  # noqa: E402  (same YAML layout as the CSV import)

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "_data" / "bpsc"
PREFIX = {"general": "gen", "islamiat": "isl", "technical": "tec", "pakistan-history": "his", "balochistan": "bal", "current-affairs": "cur"}


def section(body, name):
    m = re.search(r"^### " + re.escape(name) + r"\s*\n(.*?)(?=^### |^---\s*$|\Z)", body, re.S | re.M)
    if not m:
        return ""
    text = m.group(1).strip()
    if text.startswith("_(none)_"):
        return ""
    # The form's text is quoted ("> ") so nothing in it acts on GitHub; take the quote marks off.
    lines = [re.sub(r"^> ?", "", l) for l in text.splitlines()]
    return "\n".join(lines).replace("@​", "@").replace("\\#", "#").strip()


def field(body, name):
    m = re.search(r"^\*\*" + re.escape(name) + r":\*\* *(.+)$", body, re.M)
    return m.group(1).strip() if m else ""


def main(path):
    issue = json.loads(Path(path).read_text(encoding="utf-8"))
    body = issue.get("body") or ""
    labels = [l["name"] if isinstance(l, dict) else l for l in issue.get("labels", [])]
    bank = next((l.split(":", 1)[1] for l in labels if l.startswith("bank:")), field(body, "Bank"))
    kind = next((l.split(":", 1)[1] for l in labels if l.startswith("type:")), "question")
    if bank not in PREFIX:
        bank = "general"  # "Not sure": sana can move it in the pull request
    question, answer, source = section(body, "Question"), section(body, "Suggested answer"), section(body, "Source")
    qid = field(body, "Question id")
    asked = field(body, "Asked in")
    today = dt.date.today().isoformat()
    banks = yaml.safe_load((DATA / "banks.yml").read_text(encoding="utf-8"))
    cats = {b["slug"]: b["categories"] for b in banks}
    path_bank = DATA / f"{bank}.yml"
    text = path_bank.read_text(encoding="utf-8")
    head = "".join(l for l in text.splitlines(True)[:5] if l.startswith("#")) if text.startswith("#") else ""
    items = yaml.safe_load(text) or []
    note = []
    if kind in ("answer", "correction") and qid:
        target = next((i for i in items if i.get("id") == qid), None)
        if target is None:
            for slug in PREFIX:
                other = yaml.safe_load((DATA / f"{slug}.yml").read_text(encoding="utf-8")) or []
                if any(i.get("id") == qid for i in other):
                    bank, path_bank, items = slug, DATA / f"{slug}.yml", other
                    head = "".join(l for l in path_bank.read_text(encoding="utf-8").splitlines(True)[:5] if l.startswith("#"))
                    target = next(i for i in items if i.get("id") == qid)
                    break
        if target is None:
            sys.exit(f"Question id {qid} was not found in any bank.")
        if answer:
            target["answer"] = answer
        if source.startswith("http"):
            target["sources"] = list(dict.fromkeys((target.get("sources") or []) + [source]))
        target["verified_on"] = today
        item = target
        note.append(f"Changes the answer of `{qid}` in `{bank}.yml`.")
    else:
        nums = [int(i["id"].split("-")[1]) for i in items if re.match(r"^[a-z]+-\d+$", str(i.get("id", "")))]
        new_id = f"{PREFIX[bank]}-{(max(nums) + 1 if nums else 1):03d}"
        item = {
            "id": new_id, "bank": bank, "category": cats[bank][-1] if kind == "report" else cats[bank][0],
            "question": question, "answer": answer, "personal": False, "frequency": 1,
            "tags": ["asked-in-it-interview"] if kind == "report" else [],
            "sources": [source] if source.startswith("http") else [],
            "verified_on": today, "check_again": False, "status": "published", "added": today,
        }
        if asked:
            zone = asked.split(",")[0].strip()
            if zone and not re.match(r"^\d{4}-", zone):
                item["asked_in"] = [zone]
        items.append(item)
        note.append(f"Adds `{new_id}` to `{bank}.yml`, in the category **{item['category']}** (move it if another fits better).")
    if source and not source.startswith("http"):
        note.append(f"Source given as text, not a link: {source}")
    out = [{k: it[k] for k in ORDER if k in it} | {k: v for k, v in it.items() if k not in ORDER} for it in items]
    path_bank.write_text(head + yaml.dump(out, Dumper=Dumper, allow_unicode=True, sort_keys=False, width=120), encoding="utf-8")
    credit = field(body, "Credit") or "Anonymous"
    print("\n".join(note + ["", f"Sent by: {credit} · reference {field(body, 'Reference')}", "",
                            "Merging this pull request publishes the text exactly as it is in the diff."]))
    Path("bpsc-item-id.txt").write_text(item["id"], encoding="utf-8")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
