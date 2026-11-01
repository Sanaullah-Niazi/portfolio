# TEMPORARY: checks candidate feeds from GitHub's network. Removed before merge.
import re, sys, urllib.request, urllib.robotparser, urllib.parse
UA = "Mozilla/5.0 (compatible; sanaullahniazi.com scholarships bot; +https://sanaullahniazi.com/scholarships/)"
def get(u):
    r = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=25)
    return r.status, r.headers.get("content-type", ""), r.read(3_000_000), r.geturl()
rob = {}
def ok(u):
    p = urllib.parse.urlsplit(u); b = f"{p.scheme}://{p.netloc}"
    if b not in rob:
        rp = urllib.robotparser.RobotFileParser()
        try: rp.parse(get(b + "/robots.txt")[2].decode("utf-8", "replace").splitlines())
        except Exception as e: rp.allow_all = True
        rob[b] = rp
    return rob[b].can_fetch(UA, u)
for u in sys.argv[1:]:
    try:
        allowed = ok(u)
        s, ct, body, final = get(u)
        t = body.decode("utf-8", "replace")
        items = len(re.findall(r"<item[ >]|<entry[ >]", t))
        print(f"== {u}\n   robots={allowed} {s} {ct} items={items} final={final}")
        titles = re.findall(r"<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>", t)[:6]
        print("   titles:", titles)
        if "jobs.ac.uk/feeds" in u or "iacr.org/jobs" in u:
            print("   hrefs:", sorted(set(re.findall(r'href="([^"]*(?:rss|feed|xml)[^"]*)"', t, re.I)))[:40])
        if "iacr.org/jobs" in u:
            print("   sample:", re.sub(r"\s+", " ", t[t.find("<main"):][:3000]))
    except Exception as e:
        print(f"== {u}\n   robots={rob.get(urllib.parse.urlsplit(u).scheme+'://'+urllib.parse.urlsplit(u).netloc) and ok(u)} ERROR {e}")
