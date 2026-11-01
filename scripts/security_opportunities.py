#!/usr/bin/env python3
"""Collects security scholarships, PhD and master's positions and fellowships for /scholarships/.

Run once a day by .github/workflows/security-opportunities.yml. It:
  1. reads the public RSS/Atom feeds in SOURCES (job boards and scholarship sites that publish feeds
     for anyone to subscribe to), after checking each site's robots.txt allows it;
  2. keeps only openings that are about security (cyber, network, cloud, AI/LLM security, privacy,
     cryptography, forensics...) AND are a PhD, master's, scholarship, fellowship or postdoc;
  3. reads the closing date from the posting's own text (and, for a few postings a day without one in
     the feed, from the posting's page), drops anything whose deadline has passed, and drops postings
     with no stated deadline once they are DEADLINELESS_DAYS old;
  4. checks that every link in the hand-made list of yearly programmes (_data/sec_programs.yml) still
     opens, and records the result.

Nothing is made up: every entry on the page is a posting that a source published, with its link.
Only the Python standard library is needed.
Usage: python3 scripts/security_opportunities.py [--feed-dir DIR] [--no-pages] [--report]
  --feed-dir reads saved feeds from DIR/<source id>.xml instead of the web (for testing).
  --no-pages doesn't open posting pages or programme links (feeds only).
  --report   prints what every source returned and what was kept, for checking a run.
"""

import argparse
import datetime as dt
import hashlib
import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from security_news import plain, shorten, safe_url, parse_date, text_of, unescape_all, ATOM  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "_data" / "security_opportunities.json"
PROGRAMS_FILE = ROOT / "_data" / "sec_programs.yml"
DIRECTORY_FILE = ROOT / "_data" / "sec_directory.yml"  # "Where to look yourself" links, checked the same way

UA = "Mozilla/5.0 (compatible; sanaullahniazi.com scholarships bot; +https://sanaullahniazi.com/scholarships/)"

# Where the openings come from: feeds the sites publish for subscribers. "country" is used when the posting
# itself doesn't name one. "title_only": a general job board, so the title itself must say it is about security
# (a postdoc whose title doesn't say so is left out, even if its text mentions security). A feed that fails, or that the site's robots.txt doesn't allow, is skipped.
Q = urllib.parse.quote_plus
SOURCES = [
    # IACR's list of open positions in cryptology: a web page (no feed), read with parse_iacr().
    # "complete": the page lists every open position, so one that has left it is no longer open.
    {"id": "iacr", "name": "IACR Jobs", "home": "https://iacr.org/jobs/", "url": "https://iacr.org/jobs/", "kind": "iacr",
     "all_security": True, "complete": True},
    {"id": "daad-phd", "name": "DAAD PhDGermany", "home": "https://www.daad.de/en/", "country": "Germany",
     "url": "https://api.daad.de/api/feeds/rss/en/phd.xml"},
    # Every job at the Max Planck institutes (MPI for Security and Privacy, Software Systems, Informatics...).
    {"id": "mpg", "name": "Max Planck Society", "home": "https://www.mpg.de/career", "country": "Germany",
     "url": "https://www.mpg.de/feeds/jobs.rss", "title_only": True},
    {"id": "scholars4dev", "name": "Scholars4Dev", "home": "https://www.scholars4dev.com", "url": "https://www.scholars4dev.com/feed/"},
    {"id": "opportunitydesk", "name": "Opportunity Desk", "home": "https://opportunitydesk.org", "url": "https://opportunitydesk.org/feed/"},
]
# Job boards whose search results come as a feed. Each search is one feed.
THE_SEARCHES = ["cyber security", "information security", "cryptography", "privacy", "AI security", "network security",
                "phd security", "phd cyber", "studentship security", "doctoral cyber", "postdoc security", "fellowship cyber", "scholarship cyber",
                "phd cryptography", "phd privacy", "machine learning security", "AI safety", "postdoc cryptography"]
HERC_SEARCHES = ["cyber security", "cybersecurity", "cryptography", "privacy", "phd security", "postdoctoral security"]
WP_SEARCHES = ["cyber security", "cybersecurity", "information security"]
JOBRXIV_SEARCHES = ["security", "cybersecurity", "cryptography", "privacy"]
# More job boards on the same software as Times Higher Education (a "jobsrss" feed for each search).
MADGEX = [("chronicle", "The Chronicle of Higher Education Jobs", "https://jobs.chronicle.com", "United States"),
          ("insidehighered", "Inside Higher Ed Careers", "https://careers.insidehighered.com", "United States"),
          ("sciencecareers", "Science Careers", "https://jobs.sciencecareers.org", "")]
MADGEX_SEARCHES = ["cybersecurity", "cryptography", "privacy", "postdoc security", "phd security"]
for _id, _name, _home, _c in MADGEX:
    for _q in MADGEX_SEARCHES:
        SOURCES.append({"id": _id + "-" + re.sub(r"[^a-z]+", "-", _q), "name": _name, "home": _home, "country": _c,
                        "url": _home + "/jobsrss/?keywords=" + Q(_q), "title_only": True})
# Swedish universities publish every vacancy (PhD and postdoc posts included) as a feed on Varbi.
VARBI = [("kth", "KTH Royal Institute of Technology"), ("lu", "Lund University"), ("uu", "Uppsala University"),
         ("umu", "Umeå University"), ("su", "Stockholm University"), ("kau", "Karlstad University"),
         ("hh", "Halmstad University"), ("miun", "Mid Sweden University")]
for _id, _name in VARBI:
    SOURCES.append({"id": "varbi-" + _id, "name": _name, "home": f"https://{_id}.varbi.com/en/", "country": "Sweden",
                    "url": f"https://{_id}.varbi.com/en/what:rssfeed/", "title_only": True})
# Every vacancy at the University of Cambridge, PhD studentships included.
SOURCES.append({"id": "cambridge", "name": "University of Cambridge Jobs", "home": "https://www.jobs.cam.ac.uk",
                "country": "United Kingdom", "url": "https://www.jobs.cam.ac.uk/job/?format=rss", "title_only": True})
for _q in JOBRXIV_SEARCHES:  # jobRxiv: research jobs posted by the labs themselves
    SOURCES.append({"id": "jobrxiv-" + _q, "name": "jobRxiv", "home": "https://jobrxiv.org",
                    "url": "https://jobrxiv.org/?feed=job_feed&search_keywords=" + Q(_q), "title_only": True})
for _q in THE_SEARCHES:
    SOURCES.append({"id": "the-" + re.sub(r"[^a-z]+", "-", _q.lower()), "name": "Times Higher Education Jobs",
                    "home": "https://www.timeshighereducation.com/unijobs/",
                    "url": "https://www.timeshighereducation.com/unijobs/jobsrss/?keywords=" + Q(_q), "title_only": True})
for _q in HERC_SEARCHES:
    SOURCES.append({"id": "herc-" + re.sub(r"[^a-z]+", "-", _q.lower()), "name": "HERC Jobs", "home": "https://main.hercjobs.org",
                    "country": "United States", "url": "https://main.hercjobs.org/jobs/?display=rss&keywords=" + Q(_q),
                    "title_only": True})
for _q in WP_SEARCHES:
    _slug = re.sub(r"[^a-z]+", "-", _q.lower())
    SOURCES += [
        {"id": "scholars4dev-" + _slug, "name": "Scholars4Dev", "home": "https://www.scholars4dev.com",
         "url": "https://www.scholars4dev.com/?s=" + Q(_q) + "&feed=rss2"},
        {"id": "opportunitydesk-" + _slug, "name": "Opportunity Desk", "home": "https://opportunitydesk.org",
         "url": "https://opportunitydesk.org/?s=" + Q(_q) + "&feed=rss2"},
    ]
# Checked and left out (2026-11): FindAPhD/FindAMasters and EURAXESS forbid bots in robots.txt; Academic Positions,
# ScholarshipDb and AcademicTransfer refuse bots or have no working feed; jobs.ac.uk's old feed addresses are gone.

PER_SOURCE = 200            # newest entries read from each feed
EXCERPT_CHARS = 280         # a short teaser only; the full posting stays on the source's site
DEADLINELESS_DAYS = 45      # a posting with no closing date found is kept this long after it was posted
MAX_AGE_DAYS = 240          # nothing older than this, even with a far-off deadline
MAX_ITEMS = 600
PAGE_LOOKUPS = 120          # posting pages opened per run (missing closing date, official link)
PAGE_TIME = 9 * 60          # and at most this many seconds on them
PAGE_DELAY = 1.5            # seconds between page requests to the same site

# --- What counts as "security" -------------------------------------------------------------------------
# Each field is a filter on the page; ids must match so_field_<id> in _data/strings.yml (and translations).
FIELDS = [
    ("ai", r"\b(AI|LLM|LLMs|machine learning|deep learning|artificial intelligence|neural)\b.{0,60}\b(secur|safe|robust|adversarial|attack|privacy|trustworth|jailbreak|alignment)|"
           r"\b(secur|safe|robust|adversarial|attack|privacy|trustworth)\w*.{0,60}\b(AI|LLM|LLMs|machine learning|deep learning|artificial intelligence|neural|foundation model|generative)\b|"
           r"prompt injection|adversarial (machine|example|attack|robust)|AI safety|trustworthy AI|red[- ]?teaming"),
    ("crypto", r"cryptograph|cryptolog|\bcrypto\b|\blattice|cryptanaly|post[- ]quantum|\bPQC\b|lattice[- ]based|homomorphic|zero[- ]knowledge|\bzk|secure multi[- ]?party|\bMPC\b|blockchain|quantum[- ]safe|quantum key|encryption"),
    ("privacy", r"privacy|anonym|differential privacy|data protection|\bGDPR\b|confidential computing"),
    ("network", r"network security|intrusion detection|\bIDS\b|\b5G\b.{0,40}secur|\b6G\b.{0,40}secur|wireless secur|internet security|\bDDoS\b|firewall|zero[- ]trust"),
    ("cloud", r"cloud secur|cloud.{0,30}(attack|threat|privacy|trust)|container secur|kubernetes|serverless secur|edge.{0,20}secur|\bDevSecOps\b"),
    ("systems", r"software security|system(s)? security|secure software|vulnerabilit|fuzz|malware|reverse engineering|binary analysis|exploit|penetration test|formal verification.{0,40}secur|memory safety|web security|OS security|program analysis.{0,40}secur"),
    ("hardware", r"hardware secur|side[- ]channel|fault (attack|injection)|\bIoT\b.{0,40}secur|secur.{0,40}\bIoT\b|cyber[- ]?physical|embedded secur|automotive secur|\bICS\b|\bSCADA\b|smart grid.{0,40}secur|trusted execution|\bTEE\b"),
    ("forensics", r"forensic|incident response|threat intelligence|cybercrime|fraud detection|digital investigation|\bSOC\b"),
    ("human", r"usable secur|human factors.{0,40}secur|secur.{0,40}human factors|social engineering|phishing|disinformation|misinformation|online harm|trust and safety|cyber ?psycholog"),
    ("policy", r"cyber (law|policy|governance|diplomacy|resilience)|security policy|security governance|cyber risk|risk management.{0,30}cyber|security economics"),
]
FIELD_RES = [(f, re.compile(p, re.I)) for f, p in FIELDS]
SECURITY_RE = re.compile(
    r"cyber|\bsecurity\b|cryptograph|cryptolog|privacy|\bforensic|malware|intrusion|side[- ]channel|"
    r"adversarial|prompt injection|post[- ]quantum|homomorphic|zero[- ]knowledge|trustworthy (AI|ML|machine)|AI safety|"
    r"vulnerabilit|threat (detection|intelligence|model)|attack (detection|surface)|\bfuzz|penetration test|anonymi[sz]|"
    r"authentication|access control|blockchain|digital trust|resilien(t|ce) (system|infrastructure)|"
    # Swedish and German, for the universities' own feeds
    r"cybersäkerhet|informationssäkerhet|IT-säkerhet|datasäkerhet|kryptografi|IT-Sicherheit|Cybersicherheit|Kryptographie", re.I)
# "Security" that isn't about computers, and openings that aren't for students or researchers.
NOT_SECURITY_RE = re.compile(
    r"food security|social security|energy security|water security|job security|financial security|security guard|"
    r"security officer|security staff|securit(y|ies) (law|market|exchange)|national security studies|"
    r"securitization|securitisation|security and defence studies|health security|climate security|"
    r"nuclear security|international security|cyberball|cybernetic", re.I)

# --- What kind of opening ------------------------------------------------------------------------------
# Order matters: the first match wins (postdoc before PhD, so "Post-Doctoral" isn't read as "doctoral"). ids must match so_level_<id> in _data/strings.yml.
LEVELS = [
    ("masters", r"\bmaster'?s?\b|\bM\.?Sc\b|\bMSc\b|\bMEng\b|\bM\.?S\.? (degree|program|in)\b|\bMRes\b|\bLL\.?M\b"),
    ("postdoc", r"post[- ]?doc|postdoctoral|postdoktor|research fellow|research associate"),
    ("phd", r"\bPh\.?\s?D(s|'s)?\b|doctoral|doctorate|\bDPhil\b|studentship|\bEngD\b|\bDoktorand|graduate research assistant"),
    ("fellowship", r"fellowship|\bfellows?\b"),
    ("scholarship", r"scholarship|bursary|bursaries|stipend|grant for|grants for|tuition (waiver|fee)|award for (student|stud)|funding for (student|stud)|funded (place|position)"),
]
LEVEL_RES = [(l, re.compile(p, re.I)) for l, p in LEVELS]
# Faculty and staff jobs (not what this page is for), unless the title also says PhD/fellowship/etc.
STAFF_RE = re.compile(r"\b(faculty|lecturer|professor|professorship|chair in|head of|director|manager|officer|administrator|"
                      r"engineer|developer|analyst|technician|coordinator|consultant|specialist|architect|tutor|teacher|instructor)\b", re.I)

# --- Where ---------------------------------------------------------------------------------------------
# Region ids must match so_region_<id> in _data/strings.yml.
COUNTRIES = {
    "uk": ["United Kingdom", "UK", "England", "Scotland", "Wales", "Northern Ireland", "London", "Manchester", "Edinburgh", "Glasgow", "Birmingham",
           "Oxford", "Cambridge", "Bristol", "Leeds", "Sheffield", "Nottingham", "Southampton", "Belfast", "Cardiff", "Newcastle", "Liverpool",
           "Lancaster", "Surrey", "Kent", "Warwick", "Durham", "York", "Bath", "Exeter", "Royal Holloway", "Imperial College", "UCL", "King's College London", "Coventry"],
    "europe": ["Germany", "Netherlands", "France", "Belgium", "Switzerland", "Austria", "Sweden", "Norway", "Denmark", "Finland", "Iceland",
               "Ireland", "Spain", "Portugal", "Italy", "Greece", "Cyprus", "Malta", "Luxembourg", "Poland", "Czech", "Czechia", "Slovakia",
               "Hungary", "Romania", "Bulgaria", "Croatia", "Slovenia", "Serbia", "Estonia", "Latvia", "Lithuania", "Ukraine", "Europe", "European",
               "Berlin", "Munich", "München", "Darmstadt", "Saarbrücken", "Bochum", "Karlsruhe", "Aachen", "Amsterdam", "Delft", "Eindhoven",
               "Twente", "Leiden", "Utrecht", "Groningen", "Nijmegen", "Paris", "Grenoble", "Rennes", "Lyon", "Saclay", "Zurich", "Zürich", "ETH", "EPFL",
               "Lausanne", "Geneva", "Vienna", "Graz", "Stockholm", "KTH", "Chalmers", "Copenhagen", "DTU", "Aarhus", "Oslo", "NTNU",
               "Helsinki", "Aalto", "Dublin", "Madrid", "Barcelona", "Lisbon", "Milan", "Rome", "Turin", "Leuven", "KU Leuven", "Ghent", "Brussels"],
    "usa": ["United States", "USA", "U.S.", "California", "New York", "Texas", "Massachusetts", "Washington, DC", "Pennsylvania", "Illinois",
            "Georgia Tech", "MIT", "Harvard", "Princeton", "Columbia University", "Cornell", "Stanford", "Berkeley", "Carnegie Mellon", "Purdue", "Virginia", "Maryland", "Florida", "Arizona", "Michigan", "New Jersey", "Boston"],
    "canada": ["Canada", "Ontario", "Quebec", "Québec", "British Columbia", "Alberta", "Toronto", "Montreal", "Montréal", "Vancouver", "Waterloo", "Ottawa",
               "Canadian", "New Brunswick", "Nova Scotia", "Manitoba", "Saskatchewan"],
    "china": ["China", "Chinese", "Beijing", "Shanghai", "Shenzhen", "Hangzhou", "Nanjing", "Wuhan", "Guangzhou", "Hefei", "Tsinghua", "Zhejiang",
              "Hong Kong", "Macau", "Taiwan", "Taipei", "Hsinchu", "Kaohsiung"],
    "asia": ["Japan", "Tokyo", "Korea", "Seoul", "KAIST", "Singapore", "NUS", "NTU Singapore", "India", "IIT", "Pakistan", "Bangladesh", "Malaysia",
             "Indonesia", "Vietnam", "Thailand", "Philippines", "Sri Lanka", "Nepal"],
    "middleeast": ["United Arab Emirates", "UAE", "Abu Dhabi", "Dubai", "Saudi Arabia", "KAUST", "Qatar", "Doha", "Israel", "Turkey", "Türkiye",
                   "Oman", "Kuwait", "Bahrain", "Jordan", "Lebanon", "Iran", "MBZUAI"],
    "oceania": ["Australia", "New Zealand", "Sydney", "Melbourne", "Brisbane", "Canberra", "Adelaide", "Perth", "Auckland", "Wellington"],
    "africa": ["Africa", "African", "Nigeria", "Kenya", "Ghana", "South Africa", "Egypt", "Morocco", "Tunisia", "Ethiopia", "Rwanda", "Uganda", "Tanzania"],
    "latam": ["Brazil", "Mexico", "Chile", "Argentina", "Colombia", "Peru", "Latin America"],
}
COUNTRY_TO_REGION = {"United Kingdom": "uk", "Germany": "europe", "Netherlands": "europe", "Sweden": "europe", "United States": "usa"}
# Countries and regions themselves; a posting that names one is filed there before any city or university is
# looked at ("New York University Abu Dhabi ... United Arab Emirates" is in the Middle East, not the USA).
COUNTRY_NAMES = {"United Kingdom", "UK", "England", "Scotland", "Wales", "Northern Ireland", "Germany", "Netherlands", "France", "Belgium",
                 "Switzerland", "Austria", "Sweden", "Norway", "Denmark", "Finland", "Iceland", "Ireland", "Spain", "Portugal", "Italy", "Greece",
                 "Cyprus", "Malta", "Luxembourg", "Poland", "Czech", "Czechia", "Slovakia", "Hungary", "Romania", "Bulgaria", "Croatia", "Slovenia",
                 "Serbia", "Estonia", "Latvia", "Lithuania", "Ukraine", "United States", "USA", "Canada", "China", "Hong Kong", "Macau", "Taiwan",
                 "Japan", "Korea", "Singapore", "India", "Pakistan", "Bangladesh", "Malaysia", "Indonesia", "Vietnam", "Thailand", "Philippines",
                 "Sri Lanka", "Nepal", "United Arab Emirates", "UAE", "Saudi Arabia", "Qatar", "Israel", "Turkey", "Türkiye", "Oman", "Kuwait",
                 "Bahrain", "Jordan", "Lebanon", "Iran", "Australia", "New Zealand", "Nigeria", "Kenya", "Ghana", "South Africa", "Egypt", "Morocco",
                 "Tunisia", "Ethiopia", "Rwanda", "Uganda", "Tanzania", "Brazil", "Mexico", "Chile", "Argentina", "Colombia", "Peru"}

# Which country each place name above is in (ISO 3166 code; the page shows the name in the visitor's language).
# Names of whole regions ("Europe", "Africa", "Latin America") have no country.
_ISO_GROUPS = {
    "GB": "United Kingdom|UK|England|Scotland|Wales|Northern Ireland|London|Manchester|Edinburgh|Glasgow|Birmingham|Oxford|Cambridge|Bristol|"
          "Leeds|Sheffield|Nottingham|Southampton|Belfast|Cardiff|Newcastle|Liverpool|Lancaster|Surrey|Kent|Warwick|Durham|York|Bath|Exeter|"
          "Royal Holloway|Imperial College|UCL|King's College London|Coventry",
    "DE": "Germany|Berlin|Munich|München|Darmstadt|Saarbrücken|Bochum|Karlsruhe|Aachen",
    "NL": "Netherlands|Amsterdam|Delft|Eindhoven|Twente|Leiden|Utrecht|Groningen|Nijmegen",
    "FR": "France|Paris|Grenoble|Rennes|Lyon|Saclay", "BE": "Belgium|Leuven|KU Leuven|Ghent|Brussels",
    "CH": "Switzerland|Zurich|Zürich|ETH|EPFL|Lausanne|Geneva", "AT": "Austria|Vienna|Graz", "SE": "Sweden|Stockholm|KTH|Chalmers",
    "NO": "Norway|Oslo|NTNU", "DK": "Denmark|Copenhagen|DTU|Aarhus", "FI": "Finland|Helsinki|Aalto", "IS": "Iceland", "IE": "Ireland|Dublin",
    "ES": "Spain|Madrid|Barcelona", "PT": "Portugal|Lisbon", "IT": "Italy|Milan|Rome|Turin", "GR": "Greece", "CY": "Cyprus", "MT": "Malta",
    "LU": "Luxembourg", "PL": "Poland", "CZ": "Czech|Czechia", "SK": "Slovakia", "HU": "Hungary", "RO": "Romania", "BG": "Bulgaria",
    "HR": "Croatia", "SI": "Slovenia", "RS": "Serbia", "EE": "Estonia", "LV": "Latvia", "LT": "Lithuania", "UA": "Ukraine",
    "US": "United States|USA|U.S.|California|New York|Texas|Massachusetts|Washington, DC|Pennsylvania|Illinois|Georgia Tech|MIT|Harvard|"
          "Princeton|Columbia University|Cornell|Stanford|Berkeley|Carnegie Mellon|Purdue|Virginia|Maryland|Florida|Arizona|Michigan|New Jersey|Boston",
    "CA": "Canada|Ontario|Quebec|Québec|British Columbia|Alberta|Toronto|Montreal|Montréal|Vancouver|Waterloo|Ottawa|Canadian|New Brunswick|Nova Scotia|Manitoba|Saskatchewan",
    "CN": "China|Chinese|Beijing|Shanghai|Shenzhen|Hangzhou|Nanjing|Wuhan|Guangzhou|Hefei|Tsinghua|Zhejiang",
    "HK": "Hong Kong", "MO": "Macau", "TW": "Taiwan|Taipei|Hsinchu|Kaohsiung", "JP": "Japan|Tokyo", "KR": "Korea|Seoul|KAIST",
    "SG": "Singapore|NUS|NTU Singapore", "IN": "India|IIT", "PK": "Pakistan", "BD": "Bangladesh", "MY": "Malaysia", "ID": "Indonesia",
    "VN": "Vietnam", "TH": "Thailand", "PH": "Philippines", "LK": "Sri Lanka", "NP": "Nepal",
    "AE": "United Arab Emirates|UAE|Abu Dhabi|Dubai|MBZUAI", "SA": "Saudi Arabia|KAUST", "QA": "Qatar|Doha", "IL": "Israel",
    "TR": "Turkey|Türkiye", "OM": "Oman", "KW": "Kuwait", "BH": "Bahrain", "JO": "Jordan", "LB": "Lebanon", "IR": "Iran",
    "AU": "Australia|Sydney|Melbourne|Brisbane|Canberra|Adelaide|Perth", "NZ": "New Zealand|Auckland|Wellington",
    "NG": "Nigeria", "KE": "Kenya", "GH": "Ghana", "ZA": "South Africa", "EG": "Egypt", "MA": "Morocco", "TN": "Tunisia",
    "ET": "Ethiopia", "RW": "Rwanda", "UG": "Uganda", "TZ": "Tanzania",
    "BR": "Brazil", "MX": "Mexico", "CL": "Chile", "AR": "Argentina", "CO": "Colombia", "PE": "Peru",
}
ISO_OF = {name: code for code, names in _ISO_GROUPS.items() for name in names.split("|")}

def _rx(names):
    return re.compile(r"(?<![\w-])(" + "|".join(re.escape(n) for n in sorted(names, key=len, reverse=True)) + r")(?![\w-])")


REGION_RES = [(r, _rx([n for n in names if n in COUNTRY_NAMES])) for r, names in COUNTRIES.items()]
PLACE_RES = [(r, _rx([n for n in names if n not in COUNTRY_NAMES])) for r, names in COUNTRIES.items()]
# Words that look like places but usually aren't, in these postings.
PLACE_NOISE_RE = re.compile(r"\bMIT License|Cambridge University Press|New England|Kent State", re.I)

# --- Closing dates -------------------------------------------------------------------------------------
MONTHS = {m: i for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}
MON = r"(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?"
DATE_PATTERNS = [
    (re.compile(r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b"), "ymd"),
    (re.compile(r"\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?" + MON + r",?\s+(\d{4})\b", re.I), "dmy"),
    (re.compile(r"\b" + MON + r"\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b", re.I), "mdy"),
    (re.compile(r"\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b"), "dmy_num"),
]
DEADLINE_CUE_RE = re.compile(
    r"(closing date|deadline|apply (by|before|until|no later than)|applications? (close|closes|must be received|should be (submitted|received)|"
    r"will be accepted until|due)|last date|expires?|until|bewerbungsschluss|bewerbungsfrist|sluitingsdatum|date limite|closes on|close on|"
    r"submission date|end date)", re.I)
WEAK_CUES = ("until", "expires", "expire", "end date")
SENTENCE_END_RE = re.compile(r"[;!?]|\.\s+(?!(\d|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))[A-Z(]")
ROLLING_RE = re.compile(r"until (the )?(position|positions|post) (is|are|has been|have been) filled|rolling basis|open until filled", re.I)


def log(msg):
    print(msg, file=sys.stderr)


def to_date(m, kind):
    try:
        if kind == "ymd":
            y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        elif kind == "dmy":
            d, mo, y = int(m.group(1)), MONTHS[m.group(2)[:3].lower()], int(m.group(3))
        elif kind == "mdy":
            mo, d, y = MONTHS[m.group(1)[:3].lower()], int(m.group(2)), int(m.group(3))
        else:  # 14/12/2026 or 14.12.2026: day first, as in the UK, Europe and most of the world
            d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        return dt.date(y, mo, d)
    except (ValueError, KeyError):
        return None


def find_deadline(text, today):
    """The closing date written next to a word like "deadline" or "closing date", or None.
    Only a date that follows such a word (within about 60 characters) counts, so a start date or a
    posting date isn't taken for the deadline."""
    best = None
    for cue in DEADLINE_CUE_RE.finditer(text):
        weak = cue.group(1).lower() in WEAK_CUES
        window = text[cue.end(): cue.end() + (30 if weak else 70)]
        stop = SENTENCE_END_RE.search(window)  # "...until filled. Starts 1 March" is a start date, not a deadline
        if stop:
            window = window[:stop.start()]
        found = []
        for rx, kind in DATE_PATTERNS:
            for m in rx.finditer(window):
                d = to_date(m, kind)
                if d:
                    found.append((m.start(), d))
        if not found:
            continue
        d = min(found)[1]
        # A plausible deadline: not years in the past, not years ahead.
        if today - dt.timedelta(days=400) <= d <= today + dt.timedelta(days=730):
            if not weak:
                return d
            best = best or d  # a weak cue ("until") counts only if no strong one ("deadline") is found
    return best


def classify(title, body, source):
    """(level, fields, region, country) for a posting, or None if it isn't a security PhD/master's/scholarship/fellowship."""
    text = title + " \n " + body
    if not source.get("all_security"):  # IACR lists only cryptology and security positions
        if not SECURITY_RE.search(title) and (source.get("title_only") or not SECURITY_RE.search(body[:600])):
            return None
        if NOT_SECURITY_RE.search(title) or (not SECURITY_RE.search(NOT_SECURITY_RE.sub("", text))):
            return None
    years = [int(y) for y in re.findall(r"\b(20[2-9]\d)\b", title)]
    if years and max(years) < dt.date.today().year:
        return None  # "Fall 2025" in a title read in 2026: an old posting
    level = next((l for l, rx in LEVEL_RES if rx.search(title)), None)
    if not level:
        # Scholarship sites put "scholarship"/"fellowship" in the title; job boards put "PhD" there.
        level = next((l for l, rx in LEVEL_RES if l in ("scholarship", "fellowship") and rx.search(body[:400])), None)
    if not level:
        return None
    if STAFF_RE.search(title) and not re.search(r"ph\.?d|doctoral|studentship|fellowship|scholarship|postdoc|master", title, re.I):
        return None
    head = title + " \n " + body[:500]  # the area comes from the title and the start of the text, not every word of it
    fields = [f for f, rx in FIELD_RES if rx.search(head)]
    if not fields:
        fields = ["general"]
    places = PLACE_NOISE_RE.sub(" ", text)
    region, country = "", source.get("country", "")
    # A country named in the posting wins; then the job board's own country (HERC is American, so its "Cambridge"
    # is in Massachusetts); then a city or university named in the posting.
    hits = [(m.start(), r, m.group(1)) for r, rx in REGION_RES for m in [rx.search(places)] if m]
    if not hits and country:
        hits = [(0, COUNTRY_TO_REGION.get(country, ""), country)]
    hits = hits or [(m.start(), r, m.group(1)) for r, rx in PLACE_RES for m in [rx.search(places)] if m]
    if hits:
        _, region, name = min(hits)
        country = ISO_OF.get(name, "")
    return level, fields, region or "global", country


def fetch(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/atom+xml, application/xml, text/html;q=0.8, */*;q=0.5"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(15_000_000), r.status, r.geturl()


_robots = {}


def allowed(url):
    """True if the site's robots.txt lets this bot read the address (or the site has no robots.txt)."""
    parts = urllib.parse.urlsplit(url)
    base = f"{parts.scheme}://{parts.netloc}"
    if base not in _robots:
        rp = urllib.robotparser.RobotFileParser()
        for attempt in range(2):
            try:
                raw, status, _ = fetch(base + "/robots.txt", timeout=15)
                rp.parse(raw.decode("utf-8", "replace").splitlines())
                break
            except urllib.error.HTTPError as e:
                if e.code in (401, 403):
                    rp.disallow_all = True      # the site turns robots away
                elif e.code == 404:
                    rp.allow_all = True         # no robots.txt: nothing is off limits
                else:
                    rp = None                   # couldn't tell: stay away this time
                break
            except Exception:
                if attempt == 1:
                    rp = None                   # couldn't tell: stay away this time
                time.sleep(3)
        _robots[base] = rp
    rp = _robots[base]
    return bool(rp) and rp.can_fetch(UA, url)


def parse_feed(raw, source):
    root = ET.fromstring(raw)
    rows = []
    if root.tag == ATOM + "feed":
        for e in root.findall(ATOM + "entry")[:PER_SOURCE]:
            link = next((l.get("href", "") for l in e.findall(ATOM + "link") if l.get("rel", "alternate") == "alternate"), "")
            rows.append((text_of(e, ATOM + "title"), link, text_of(e, ATOM + "published", ATOM + "updated"),
                         text_of(e, ATOM + "content", ATOM + "summary")))
    else:
        for it in list(root.iter("item"))[:PER_SOURCE]:
            rows.append((text_of(it, "title"), text_of(it, "link", "guid"),
                         text_of(it, "pubDate", "{http://purl.org/dc/elements/1.1/}date"),
                         text_of(it, "{http://purl.org/rss/1.0/modules/content/}encoded", "description")))
    return rows


def parse_iacr(raw):
    """IACR's jobs page: each posting is a <h5><a href=URL id="url-N"><span id="position-N">title</span></a></h5>,
    then <h6 id="place-N">organisation, place</h6> and <div id="description-N">. Returns the same rows as parse_feed."""
    page = raw.decode("utf-8", "replace")
    rows = []
    for m in re.finditer(r'<a\s+href="([^"]+)"\s+id="url-(\d+)"', page):
        n = m.group(2)
        chunk = page[m.start(): m.start() + 40_000]
        nxt = re.search(r'id="url-(?!' + n + r'")\d+"', chunk[10:])
        if nxt:
            chunk = chunk[: nxt.start() + 10]
        title = re.search(r'id="position-' + n + r'"[^>]*>(.*?)</span>', chunk, re.S)
        place = re.search(r'id="place-' + n + r'"[^>]*>(.*?)</h6>', chunk, re.S)
        desc = re.search(r'id="description-' + n + r'"[^>]*>(.*)', chunk, re.S)
        posted = re.search(r"(?:[Pp]osted|[Ll]ast updated)[^0-9]{0,40}(\d{4}-\d{2}-\d{2})", chunk)
        if not title:
            continue
        link = html.unescape(m.group(1))
        if not link.startswith("http"):
            link = "https://iacr.org/jobs/item/" + n
        body = (plain(place.group(1)) + ". " if place else "") + (plain(desc.group(1)) if desc else "")
        name = plain(title.group(1))
        if place and len(name.split()) <= 3:  # "PhD student" alone says little; add who is hiring
            name += " · " + plain(place.group(1)).split(";")[0].split(",")[0].strip()
        rows.append((name, link, posted.group(1) if posted else "", body))
    return rows[:PER_SOURCE]


def posting_id(url):
    return hashlib.sha1(key_url(url).encode()).hexdigest()[:12]


def key_url(url):
    u = re.sub(r"#.*$", "", url.lower())
    u = re.sub(r"[?&](utm_[a-z]+|source|ref|cmpid)=[^&]*", "", u)
    return re.sub(r"^https?://(www\.)?", "", u).rstrip("/?&")


def key_title(title):
    return re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()


def title_words(title):
    return frozenset(w for w in key_title(title).split() if len(w) > 2 and w not in ("the", "and", "for", "with"))


def same_posting(a, b):
    """Two boards often carry one posting under titles in a different order ("University X: Postdoc in Y" and
    "Postdoc in Y | University X"); the same words, or one title's words all inside the other's, mean the same posting."""
    small, big = (a, b) if len(a) <= len(b) else (b, a)
    return len(small) >= 5 and small <= big


def collect(feed_dir, now, report):
    today = now.date()
    found, status = [], {}
    for s in SOURCES:
        try:
            if feed_dir:
                path = Path(feed_dir) / (s["id"] + ".xml")
                if not path.exists():
                    continue
                raw = path.read_bytes()
            else:
                if not allowed(s["url"]):
                    status[s["id"]] = "not allowed by robots.txt"
                    log(f"{s['id']}: skipped, robots.txt doesn't allow it")
                    continue
                raw, _, _ = fetch(s["url"])
            rows = parse_iacr(raw) if s.get("kind") == "iacr" else parse_feed(raw, s)
        except Exception as e:  # one broken feed should not stop the others
            status[s["id"]] = f"failed ({e.__class__.__name__})"
            log(f"{s['id']}: skipped ({e.__class__.__name__}: {e})")
            continue
        kept = 0
        for title, link, date, body in rows:
            title, link = unescape_all(plain(title)), safe_url(link)
            if not title or not link:
                continue
            if s.get("only"):
                if not re.search(s["only"], title, re.I):
                    continue
                title = re.sub(s["only"] + r"\s*:?\s*", "", title, flags=re.I)
            body = plain(body)
            c = classify(title, body, s)
            if report and c is None and SECURITY_RE.search(title):
                log(f"   - not kept: {title[:110]}")
            if not c:
                continue
            level, fields, region, country = c
            posted = parse_date(date) or now
            deadline = find_deadline(title + ". " + body, today)
            found.append({
                "id": posting_id(link),
                "title": shorten(title, 220),
                "url": link,
                "source": s["name"],
                "level": level,
                "fields": fields,
                "region": region,
                "country": country,
                "posted": posted.strftime("%Y-%m-%d"),
                "deadline": deadline.isoformat() if deadline else "",
                "rolling": bool(not deadline and ROLLING_RE.search(body)),
                "seen": today.isoformat(),  # the last day the source still listed it
                "excerpt": shorten(body, EXCERPT_CHARS),
            })
            kept += 1
        status[s["id"]] = f"{len(rows)} read, {kept} kept"
        log(f"{s['id']}: {len(rows)} entries, {kept} security openings")
    return found, status


def merge(found, old_items, now, complete=()):
    """New copies first (their text follows the feed), then yesterday's, minus anything closed or stale.
    `complete` names sources that were read in full today: their postings that are gone from the source are dropped."""
    today = now.date()
    seen_u, seen_t, seen_w, items = set(), set(), [], []
    # A closing date found on the posting's own page yesterday is kept when the feed copy still has none.
    earlier = {key_url(o["url"]): o for o in old_items}
    for it in found:
        o = earlier.get(key_url(it["url"]))
        if o and o.get("page_checked"):  # what yesterday's look at the posting page found
            it["page_checked"] = o["page_checked"]
            if not it["deadline"]:
                it["deadline"] = o["deadline"]
            if "official" in o:
                it["official"] = o["official"]
    for it in found + [o for o in old_items if o["source"] not in complete]:
        ku, kt, tw = key_url(it["url"]), key_title(it["title"]), title_words(it["title"])
        if ku in seen_u or kt in seen_t or any(same_posting(tw, w) for w in seen_w):
            continue
        posted = dt.date.fromisoformat(it["posted"])
        if posted > today + dt.timedelta(days=2) or (today - posted).days > MAX_AGE_DAYS:
            continue
        if it.get("deadline"):
            if dt.date.fromisoformat(it["deadline"]) < today:
                continue  # closed
        elif (today - posted).days > DEADLINELESS_DAYS:
            continue  # no closing date and old: probably filled, so it goes
        seen_u.add(ku)
        seen_t.add(kt)
        seen_w.append(tw)
        items.append(it)
    items.sort(key=lambda i: (i["deadline"] or "9999", i["posted"]))
    return items[:MAX_ITEMS]


# Sites that list other people's openings. A posting found on one of them gets its "official" link (the
# university's, lab's or funder's own page) from the posting page, so the Apply button skips the middleman.
LISTING_HOSTS = ("iacr.org", "timeshighereducation.com", "jobs.chronicle.com", "careers.insidehighered.com",
                 "jobs.sciencecareers.org", "hercjobs.org", "jobrxiv.org", "scholars4dev.com", "opportunitydesk.org",
                 "findaphd.com", "findamasters.com", "euraxess.ec.europa.eu", "academicpositions.com", "linkedin.com",
                 "scholarshipportal.com", "phdportal.com", "jobs.ac.uk", "academictransfer.com", "indeed.com", "glassdoor.com")
# Links on a posting page that are never the official page: sharing buttons, maps, app stores, trackers.
SKIP_HOSTS = ("facebook.com", "twitter.com", "x.com", "instagram.com", "youtube.com", "tiktok.com", "whatsapp.com",
              "pinterest.com", "reddit.com", "t.me", "telegram.me", "google.com", "goo.gl", "apple.com", "microsoft.com",
              "addtoany.com", "addthis.com", "sharethis.com", "doubleclick.net", "cookiebot.com", "onetrust.com", "madgex.com",
              "wordpress.org", "wordpress.com", "gravatar.com", "w3.org", "schema.org", "creativecommons.org", "bit.ly",
              "cloudflare.com", "jsdelivr.net", "gstatic.com", "googletagmanager.com", "feedburner.com", "mailchimp.com",
              "timeshighereducation.com", "thewire.com")
APPLY_TEXT_RE = re.compile(r"\bappl(y|ication)|more (info|details)|further (details|information|particulars)|"
                           r"job (ad|advert|description|posting|details)|official|vacancy|position details|full (ad|advert|details)|"
                           r"original (ad|advert|posting)|website|read more|details|here\b", re.I)
ACADEMIC_HOST_RE = re.compile(r"\.edu(\.[a-z]{2})?$|\.ac\.[a-z]{2}$|\.edu\.|univ|\buni-|\.uni\.|college|institut|"
                              r"\.gov(\.[a-z]{2})?$|\.gouv\.|cnrs|inria|mpg\.de|fraunhofer|helmholtz|ethz|epfl|cispa|"
                              r"varbi\.com|jobs\.cam\.ac\.uk|oraclecloud\.com|workday|successfactors|myworkdayjobs|taleo|"
                              r"emply|jobbnorge|recruitee|smartrecruiters|lever\.co|greenhouse\.io|bamboohr|personio|softgarden|"
                              r"umantis|rexx|interamt|\.tu-|tudelft|tue\.nl|kuleuven|ugent|\.dtu\.dk|aalto|kth\.se|cwi\.nl|"
                              r"\.ens\.|polytechnique|imdea|bsc\.es|nus\.edu|ntu\.edu|a-star|kaust|mbzuai", re.I)


def host_of(url):
    return urllib.parse.urlsplit(url).netloc.lower().split(":")[0].removeprefix("www.")


def is_listing(url):
    h = host_of(url)
    return any(h == d or h.endswith("." + d) for d in LISTING_HOSTS)


def find_official_link(raw, page_url):
    """The best link on a listing site's posting page to the employer's own page, or "" if there is none
    (some postings only give an email address)."""
    page = raw.decode("utf-8", "replace")
    page = re.sub(r"(?is)<(script|style|nav|footer|header)\b.*?</\1>", " ", page)
    own = host_of(page_url)
    for m in (re.finditer(r'(?is)<a\s[^>]*?href\s*=\s*["\']([^"\'#]+)["\'][^>]*>(.*?)</a>', page)):
        href = urllib.parse.urljoin(page_url, html.unescape(m.group(1)).strip())
        if not href.startswith(("http://", "https://")):
            continue
        h = host_of(href)
        if not h or h == own or h.endswith("." + own) or is_listing(href) or any(h == d or h.endswith("." + d) for d in SKIP_HOSTS):
            continue
        path = urllib.parse.urlsplit(href).path.lower()
        if path in ("", "/") or path.endswith((".pdf", ".doc", ".docx", ".jpg", ".png")):
            continue  # a home page or a document is not the posting
        text = plain(m.group(2))
        # Only a link that both says it is the posting/application and goes to a university, institute or
        # recruiting system counts. A wrong "official" link is worse than none, so when in doubt there is none.
        if APPLY_TEXT_RE.search(text) and ACADEMIC_HOST_RE.search(h):
            return safe_url(href)
    return ""


def check_pages(items, now, budget, report=False):
    """Opens up to `budget` posting pages (robots.txt and crawl-delay permitting) to find a closing date the feed
    left out and, for postings on listing sites, the link to the official page. Each page is opened once."""
    today, last, started = now.date(), {}, time.monotonic()
    for it in items:
        if "official" not in it and not is_listing(it["url"]):
            it["official"] = it["url"]  # already the university's or lab's own page
    todo = [i for i in items if (not i["deadline"] and not i.get("page_checked")) or "official" not in i]
    todo.sort(key=lambda i: i["posted"], reverse=True)
    for it in todo[:budget]:
        if time.monotonic() - started > PAGE_TIME:
            log("   page checks stopped for today (time limit)")
            break
        it["page_checked"] = today.isoformat()
        host = urllib.parse.urlsplit(it["url"]).netloc
        try:
            if not allowed(it["url"]):
                it.setdefault("official", "")
                continue
            rp = _robots.get("{0.scheme}://{0.netloc}".format(urllib.parse.urlsplit(it["url"])))
            delay = max(PAGE_DELAY, float((rp.crawl_delay(UA) if rp else 0) or 0))
            wait = delay - (time.monotonic() - last.get(host, 0))
            if wait > 0:
                time.sleep(wait)
            raw, _, final = fetch(it["url"], timeout=20)
            last[host] = time.monotonic()
            if not it["deadline"]:
                d = find_deadline(plain(raw.decode("utf-8", "replace"))[:60_000], today)
                if d:
                    it["deadline"] = d.isoformat()
                    log(f"   deadline {d} from the page: {it['title'][:80]}")
            if "official" not in it:
                it["official"] = final if final and not is_listing(final) else find_official_link(raw, final or it["url"])
                if report:
                    log(f"   official: {it['official'] or '(none found)'} <- {it['title'][:70]}")
        except Exception as e:
            log(f"   page skipped ({e.__class__.__name__}): {it['url']}")


def load_programs():
    """Reads the id and url of each entry in _data/sec_programs.yml and _data/sec_directory.yml (simple lists; no
    YAML library needed)."""
    progs, cur = [], None
    lines = []
    for f in (PROGRAMS_FILE, DIRECTORY_FILE):
        if f.exists():
            lines += f.read_text(encoding="utf-8").splitlines()
    for line in lines:
        m = re.match(r"^- id:\s*(\S+)", line)
        if m:
            cur = {"id": m.group(1)}
            progs.append(cur)
            continue
        m = re.match(r"^\s+url:\s*\"?([^\"\s]+)\"?", line)
        if m and cur is not None and "url" not in cur:
            cur["url"] = m.group(1)
    return [p for p in progs if p.get("url")]


def check_programs(old, now, report):
    """Opens each programme link once a day. The page hides a programme only after its link has answered
    "not found" three days running, so a short outage or a bot check doesn't remove it."""
    out = {}
    for p in load_programs():
        prev = old.get(p["id"], {})
        rec = {"checked": now.strftime("%Y-%m-%d"), "ok": prev.get("ok", True), "fails": prev.get("fails", 0)}
        try:
            raw, status, final = fetch(p["url"], timeout=25)
            title = re.search(rb"<title[^>]*>(.*?)</title>", raw[:200_000], re.I | re.S)
            rec.update(ok=True, fails=0)
            if report:
                log(f"   ok {status} {p['id']}: {plain(title.group(1).decode('utf-8', 'replace'))[:90] if title else '(no title)'} <{final}>")
        except urllib.error.HTTPError as e:
            # Only "not found" or "gone" means the page is dead. 401/403/429/5xx is a bot check or an outage:
            # a person can usually still open it, so it doesn't count.
            if e.code in (404, 410):
                rec["fails"] = rec["fails"] + 1
            if report:
                log(f"   {'XX' if e.code in (404, 410) else '??'} {e.code} {p['id']} <{p['url']}>")
        except Exception as e:
            # Timeouts and connection errors are often the site blocking cloud servers, not a dead page.
            if report:
                log(f"   ?? {e.__class__.__name__} {p['id']} (not counted) <{p['url']}>")
        if rec["fails"] >= 3:
            rec["ok"] = False
        out[p["id"]] = rec
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--feed-dir", help="read saved feeds from this folder instead of the web (for testing)")
    ap.add_argument("--no-pages", action="store_true", help="don't open posting pages or programme links")
    ap.add_argument("--report", action="store_true", help="print details of what was read and kept")
    args = ap.parse_args()
    now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)

    old = json.loads(DATA_FILE.read_text(encoding="utf-8")) if DATA_FILE.exists() else {}
    found, status = collect(args.feed_dir, now, args.report)
    working = sum(1 for v in status.values() if v.endswith("kept"))
    if working == 0:
        log("No feed could be read; leaving the page as it is.")
        return 1
    complete = {s["name"] for s in SOURCES if s.get("complete") and status.get(s["id"], "").endswith("kept")
                and not status[s["id"]].startswith("0 read")}  # an empty page means it changed, not that all closed
    items = merge(found, old.get("items", []), now, complete)
    if not args.no_pages and not args.feed_dir:
        check_pages(items, now, PAGE_LOOKUPS, args.report)
        items = merge(items, [], now)
    programs = old.get("programs", {}) if args.no_pages or args.feed_dir else check_programs(old.get("programs", {}), now, args.report)

    names = {}
    for s in SOURCES:
        if status.get(s["id"], "").endswith("kept"):
            names.setdefault(s["name"], s["home"])
    counts = {}
    for it in items:
        counts[it["source"]] = counts.get(it["source"], 0) + 1
    data = {
        "updated": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "sources": [{"name": n, "home": h, "count": counts.get(n, 0)} for n, h in names.items()],
        "items": items,
        "programs": programs,
    }
    DATA_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    log(f"Saved {len(items)} open opportunities from {len(names)} sources.")
    if args.report:
        by = {}
        for it in items:
            by.setdefault(it["level"], 0)
            by[it["level"]] += 1
        log("By level: " + json.dumps(by))
        for it in items[:400]:
            log(f"   [{it['level']}/{it['region']}:{it.get('country') or '-'}/{','.join(it['fields'])}] {it['deadline'] or '----------'} {it['source']}: {it['title'][:100]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
