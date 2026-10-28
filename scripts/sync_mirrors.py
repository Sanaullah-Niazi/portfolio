#!/usr/bin/env python3
"""Builds the content of the tool repos that mirror parts of this site.

Run by .github/workflows/sync-tool-repos.yml after every change on main. This repository stays the
main copy: each tool repo gets a fresh copy of the files listed in MIRRORS below, plus its own
README.md (from mirrors/<repo>/README.md) and an MIT LICENSE. Edits made directly in a tool repo
are overwritten by the next sync, so always edit here.

Usage: python3 scripts/sync_mirrors.py OUT_DIR   (writes OUT_DIR/<repo>/ for every repo)
       python3 scripts/sync_mirrors.py --list    (prints the repo names)
"""

import glob
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANGS = "{de,ur,zh}"

# repo name: list of (pattern, place). The pattern is a glob from the root of this repository
# ({a,b} is expanded). A file keeps its path, unless place is set: then it goes into that folder.
MIRRORS = {
    "free-security-tools": [
        ("assets/js/tools.js", None),
        ("assets/js/eff-short-words.js", None),
        ("assets/js/pil.js", None),
        ("_data/pil_attacks.yml", None),
        ("_data/pil_rules.json", None),
        ("_includes/pages/tool.html", None),
        ("_includes/pages/tools.html", None),
        ("_includes/tools/*.html", None),
        ("_data/tool_list.yml", None),
        ("_data/tools.yml", None),
        (f"_data/{LANGS}/tools.yml", None),
        ("tools/**", None),
        (f"{LANGS}/tools/**", None),
        ("assets/img/tools/*.jpg", "screenshots"),
    ],
    "website-health-checker": [
        ("worker/**", None),
        ("_data/pil_rules.json", None),
        ("_data/pil_attacks.yml", None),
        ("assets/js/health-checker.js", None),
        ("assets/js/health-report-pdf.js", None),
        ("_includes/tools/web.html", None),
        ("tools/website-health-checker/index.html", None),
        (f"{LANGS}/tools/website-health-checker/index.html", None),
        (".github/workflows/deploy-worker.yml", "ci"),
        ("assets/img/tools/website-health-checker.jpg", "screenshots"),
    ],
    "security-learning-roadmaps": [
        ("_data/roadmaps.yml", None),
        ("_data/cert_roadmaps.yml", None),
        ("_data/sec_roadmaps.yml", None),
        ("_data/sec_frameworks.yml", None),
        ("_data/sec_domains/*.yml", None),
        (f"_data/{LANGS}/roadmaps.yml", None),
        (f"_data/{LANGS}/cert_roadmaps.yml", None),
        ("_includes/pages/{roadmaps,certifications,sec-roadmaps,sec-frameworks,sec-domain}.html", None),
        ("assets/js/sec-roadmaps.js", None),
        ("roadmaps/**", None),
        (f"{LANGS}/roadmaps/**", None),
        (".github/workflows/check-roadmap-links.yml", "ci"),
    ],
    "security-news-bot": [
        ("scripts/security_news.py", None),
        ("_data/security_news.json", None),
        ("_briefs/*.md", None),
        ("_layouts/brief.html", None),
        ("_includes/pages/security-news.html", None),
        ("security-news/**", None),
        (f"{LANGS}/security-news/**", None),
        (".github/workflows/security-news.yml", "ci"),
    ],
}

MIT = """MIT License

Copyright (c) 2024-2026 Sana Ullah Khan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""

# Files a repo leaves out even though its patterns match them (the checker has its own repo).
EXCLUDE = {
    "free-security-tools": ["_includes/tools/web.html", "**/tools/website-health-checker/**",
                            "tools/website-health-checker/**", "assets/img/tools/website-health-checker.jpg"],
}

# Never copied, whatever the patterns say.
SKIP_PARTS = {"node_modules", ".wrangler", ".dev.vars", ".env"}


def expand(pattern):
    """Expands {a,b,c} groups, then globs."""
    start = pattern.find("{")
    if start == -1:
        return sorted(glob.glob(os.path.join(ROOT, pattern), recursive=True))
    end = pattern.index("}", start)
    out = []
    for choice in pattern[start + 1:end].split(","):
        out += expand(pattern[:start] + choice + pattern[end + 1:])
    return out


def build(repo, out):
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    count = 0
    skip = {p for pattern in EXCLUDE.get(repo, []) for p in expand(pattern)}
    for pattern, place in MIRRORS[repo]:
        matches = [p for p in expand(pattern) if os.path.isfile(p) and p not in skip]
        if not matches:
            print(f"warning: {repo}: nothing matches {pattern}", file=sys.stderr)
        for src in matches:
            rel = os.path.relpath(src, ROOT)
            if SKIP_PARTS & set(rel.split(os.sep)):
                continue
            dest = os.path.join(out, place, os.path.basename(rel)) if place else os.path.join(out, rel)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.copy2(src, dest)
            count += 1
    shutil.copy2(os.path.join(ROOT, "mirrors", repo, "README.md"), os.path.join(out, "README.md"))
    with open(os.path.join(out, "LICENSE"), "w") as f:
        f.write(MIT)
    print(f"{repo}: {count} files")


def main():
    if sys.argv[1:] == ["--list"]:
        print("\n".join(MIRRORS))
        return
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    for repo in MIRRORS:
        build(repo, os.path.join(sys.argv[1], repo))


if __name__ == "__main__":
    main()
