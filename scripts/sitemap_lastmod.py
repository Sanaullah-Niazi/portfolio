"""Fill in sitemap.xml's <lastmod> dates from git history.

The sitemap template (sitemap.xml) gives pages without their own date the build time and a <!--src:path--> note.
This script, run after `jekyll build` in the deploy workflow, replaces that time with the date of the last commit
that changed the page: its own file, the page template it includes (_includes/pages/<name>.html) and that
template's data (_data/<name>.yml, plus the translation in _data/<lang>/ for translated pages).
It needs the full git history (actions/checkout with fetch-depth: 0).

Usage: python scripts/sitemap_lastmod.py [_site/sitemap.xml]
"""
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INCLUDE_RE = re.compile(r"\{%-?\s*include\s+pages/([\w-]+)\.html")
NOTE_RE = re.compile(r"<lastmod>[^<]*</lastmod><!--src:([^>]*)-->")


def last_commit(paths):
    paths = [p for p in paths if (ROOT / p).exists()]
    if not paths:
        return None
    out = subprocess.run(["git", "log", "-1", "--format=%cI", "--", *paths],
                         cwd=ROOT, capture_output=True, text=True).stdout.strip()
    return out or None


def sources_for(src):
    paths = [src]
    path = ROOT / src
    if path.suffix in (".html", ".md") and path.exists():
        m = INCLUDE_RE.search(path.read_text(encoding="utf-8"))
        if m:
            name = m.group(1)
            paths += [f"_includes/pages/{name}.html", f"_data/{name}.yml"]
            lang = src.split("/")[0]
            if lang in ("ur", "de", "zh"):
                paths.append(f"_data/{lang}/{name}.yml")
    return paths


def main(sitemap="_site/sitemap.xml"):
    sitemap = Path(sitemap)
    text = sitemap.read_text(encoding="utf-8")
    cache = {}

    def fill(m):
        src = m.group(1)
        if src not in cache:
            cache[src] = last_commit(sources_for(src))
        when = cache[src]
        return f"<lastmod>{when}</lastmod>" if when else m.group(0).split("<!--")[0]

    text = NOTE_RE.sub(fill, text)
    sitemap.write_text(text, encoding="utf-8")
    print(f"sitemap: dated {len(cache)} sources from git")


if __name__ == "__main__":
    main(*sys.argv[1:])
