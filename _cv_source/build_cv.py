"""Builds the translated CV PDFs (German, Chinese, Urdu) from cv_<lang>.yml.

The English CV (assets/cv/Sana_Ullah_Khan_CV.pdf) is the original and is not built here.
To rebuild after editing a cv_<lang>.yml file, run from the repository root:

    python3 _cv_source/build_cv.py de zh ur

It writes assets/cv/Sana_Ullah_Khan_CV_<lang>.pdf using the Chromium that ships with Playwright.
Urdu needs the "Noto Nastaliq Urdu" font installed; Chinese needs a Simplified Chinese font
(Noto Sans SC or WenQuanYi Zen Hei).
"""
import html
import json
import pathlib
import subprocess
import sys

import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "_cv_source"
OUT = ROOT / "assets" / "cv"

# Same for every language: names, contact details and the papers (titles stay in their published English).
NAME = "Sana Ullah Khan"
CONTACT = [
    "sanaullahkhan.hse@gmail.com",
    "linkedin.com/in/sanaullahkhanniazi",
    "github.com/Sanaullah-Niazi",
    "sanaullahniazi.com",
]
PUBS = [
    '<b>Khan, S. U.</b>, Zafar, U., Imran, S., &amp; Ali, M. (2026). <b>Artificial Intelligence–Driven Fraud Detection in FinTech: '
    'Strengthening Cybersecurity Against Digital Financial Scams.</b> <i>Journal of Business Insight and Innovation</i>, 5(6), 72–82. '
    '<span class="doi">doi:10.63544/jbii.v5i6.116</span>',
    '<b>Khan, S. U.</b>, Zafar, R., Alam, M. M., &amp; Iqbal, M. (2026). <b>Artificial Intelligence and Workplace Safety in the Oil and '
    'Gas Industry: Transforming Occupational Risk Assessment through Smart Safety Analytics.</b> <i>Periodicals of Management Studies</i>, 6(1). '
    '<span class="doi">doi:10.65181/poms.06.01.0100</span>',
    'Soomro, M. A., Khalid, M. A., Mangi, A. R., &amp; <b>Khan, S. U.</b> (2026). <b>GenAI Adoption in Entrepreneurial Education and '
    'Digital Entrepreneurial Intention.</b> <i>International Journal of Advanced Social Studies</i>, 6(1), 82–93. '
    '<span class="doi">doi:10.70843/ijass.2026.06107</span>',
]

FONTS = {
    "de": "'Inter', 'Liberation Sans', sans-serif",
    "zh": "'Inter', 'Noto Sans SC', 'WenQuanYi Zen Hei', sans-serif",
    "ur": "'Noto Nastaliq Urdu', 'Inter', sans-serif",
}
# Nastaliq needs far more line height than Latin or Chinese text.
LINE = {"de": 1.42, "zh": 1.55, "ur": 2.05}
SIZE = {"de": 9.6, "zh": 9.6, "ur": 9.4}

CSS = """
@page { size: A4; margin: 14mm 15mm 16mm; }
* { box-sizing: border-box; }
html { font-family: %(font)s; font-size: %(size)spt; line-height: %(line)s; color: #1d2430; }
body { margin: 0; }
.ltr, .doi, .contact, .pubs li, [lang="en"] { font-family: 'Inter', 'Liberation Sans', sans-serif; }
.pubs li, .contact { direction: ltr; text-align: left; }
h1 { font-family: 'Inter', sans-serif; font-size: 25pt; line-height: 1.1; margin: 0 0 2mm; letter-spacing: -0.01em; }
.title { font-size: 1.22em; font-weight: 700; color: #0f5e66; margin: 0 0 1mm; }
.creds { font-size: 0.9em; font-weight: 600; margin: 0 0 1mm; }
.contact { font-size: 0.86em; color: #4a5563; margin: 0; }
.contact span + span::before { content: " | "; color: #9aa3ad; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm; margin: 4mm 0 3mm; }
.stats div { border-inline-start: 2.5px solid #0f8a95; background: #f2f6f7; padding: 1.6mm 2.4mm; }
.stats b { display: block; font-size: 1.06em; }
.stats span { font-size: 0.8em; color: #4a5563; }
h2 { font-size: 1.04em; letter-spacing: 0.06em; text-transform: uppercase; color: #1d2430; border-bottom: 1px solid #c9d1d8;
     padding-bottom: 0.6mm; margin: 4.2mm 0 2mm; break-after: avoid; }
:lang(ur) h2, :lang(zh-Hans) h2 { letter-spacing: 0; text-transform: none; font-size: 1.12em; }
.note { font-weight: 400; font-size: 0.8em; color: #6b7480; text-transform: none; letter-spacing: 0; margin-inline-start: 2mm; }
p { margin: 0 0 1.6mm; }
.entry { margin: 0 0 2.6mm; break-inside: avoid; }
.row { display: flex; justify-content: space-between; gap: 4mm; align-items: baseline; }
.row b { font-size: 1.04em; }
.dates { white-space: nowrap; font-weight: 600; font-size: 0.92em; }
.sub { color: #2f3946; }
.meta { font-size: 0.9em; color: #4a5563; }
ul { margin: 0.6mm 0 0; padding-inline-start: 5mm; }
li { margin: 0 0 0.5mm; }
.pubs { list-style: none; padding: 0; }
.pubs li { margin-bottom: 1.6mm; break-inside: avoid; }
.doi { color: #0f6e78; }
.group { font-size: 0.84em; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #4a5563; margin: 2mm 0 0.8mm; }
:lang(ur) .group, :lang(zh-Hans) .group { letter-spacing: 0; text-transform: none; }
.cert { display: flex; justify-content: space-between; gap: 4mm; margin: 0 0 0.6mm; }
.cert .ltr { font-weight: 500; }
.cert .by { color: #4a5563; font-size: 0.92em; text-align: end; }
.kv { display: grid; grid-template-columns: 26mm 1fr; gap: 0.6mm 4mm; }
.kv dt { font-weight: 700; }
.kv dd { margin: 0; }
.statement { break-before: page; }
.statement h3 { font-size: 1.02em; margin: 3mm 0 1mm; }
.intro { font-style: italic; }
:lang(ur) .intro { font-style: normal; }
"""


def e(text):
    """Escapes plain text but keeps the small bits of markup used in the YAML (<span lang="en">…</span>)."""
    text = str(text)
    return text if "<span" in text else html.escape(text, quote=False)


def ltr(text):
    return f'<span class="ltr" dir="ltr" lang="en">{html.escape(text, quote=False)}</span>'


def build_html(cv):
    lang = cv["lang"]
    tag = "zh-Hans" if lang == "zh" else lang
    h = cv["h"]
    out = [f'<!doctype html><html lang="{tag}" dir="{cv["dir"]}"><head><meta charset="utf-8"><title>{NAME} · CV</title>',
           f'<style>{CSS % {"font": FONTS[lang], "size": SIZE[lang], "line": LINE[lang]}}</style></head><body>']
    out.append(f'<h1 lang="en" dir="ltr" style="text-align:{"right" if cv["dir"] == "rtl" else "left"}">{NAME}</h1>')
    out.append(f'<p class="title">{e(cv["title"])}</p><p class="creds">{e(cv["creds"])}</p>')
    out.append('<p class="contact">' + "".join(f"<span>{c}</span>" for c in [cv["location"]] + CONTACT) + "</p>")
    out.append('<div class="stats">' + "".join(f"<div><b>{e(a)}</b><span>{e(b)}{cv.get('comma', ', ')}{e(c)}</span></div>" for a, b, c in cv["stats"]) + "</div>")

    out.append(f'<h2>{h["profile"]}</h2><p>{e(cv["profile"])}</p>')

    out.append(f'<h2>{h["education"]}</h2>')
    for ed in cv["education"]:
        out.append(f'<div class="entry"><div class="row"><b>{e(ed["degree"])}</b><span class="dates">{e(ed["dates"])}</span></div>'
                   f'<div class="sub">{e(ed["school"])}</div><div class="meta">{e(ed["meta"])}</div>')
        if ed["points"]:
            out.append("<ul>" + "".join(f"<li>{e(p)}</li>" for p in ed["points"]) + "</ul>")
        out.append("</div>")

    out.append(f'<h2>{h["publications"]}<span class="note">{h["publications_note"]}</span></h2>')
    out.append('<ul class="pubs" lang="en" dir="ltr">' + "".join(f"<li>{p}</li>" for p in PUBS) + "</ul>")

    out.append(f'<h2>{h["experience"]}</h2>')
    for ex in cv["experience"]:
        out.append(f'<div class="entry"><div class="row"><b>{e(ex["role"])}</b><span class="dates">{e(ex["dates"])}</span></div>'
                   f'<div class="sub">{e(ex["org"])}</div><ul>' + "".join(f"<li>{e(p)}</li>" for p in ex["points"]) + "</ul></div>")

    out.append(f'<h2>{h["certifications"]}<span class="note">{h["certifications_note"]}</span></h2>')
    for g in cv["cert_groups"]:
        out.append(f'<div class="entry"><div class="group">{e(g["name"])}</div>')
        for name, by in g["items"]:
            out.append(f'<div class="cert">{ltr(name)}<span class="by">{e(by)}</span></div>')
        out.append("</div>")

    out.append(f'<h2>{h["skills"]}</h2><dl class="kv">' + "".join(f"<dt>{e(k)}</dt><dd>{e(v)}</dd>" for k, v in cv["skills"]) + "</dl>")
    out.append(f'<h2>{h["languages"]}</h2><dl class="kv">' + "".join(f"<dt>{e(k)}</dt><dd>{e(v)}</dd>" for k, v in cv["languages"]) + "</dl>")
    out.append(f'<h2>{h["references"]}</h2><p>{e(cv["references"])}</p>')

    st = cv["statement"]
    out.append(f'<section class="statement"><h2>{h["statement"]}</h2><p class="intro">{e(st["intro"])}</p>')
    for part in st["parts"]:
        out.append(f'<h3>{e(part["h"])}</h3>' + "".join(f"<p>{e(p)}</p>" for p in part["p"]))
    out.append("</section></body></html>")
    return "".join(out)


def footer(cv):
    lang = cv["lang"]
    page = html.escape(cv["page"]).replace("[n]", '<span class="pageNumber"></span>').replace("[t]", '<span class="totalPages"></span>')
    left, right = f"{NAME} · {html.escape(cv['footer'])}", page
    return (f'<div dir="{cv["dir"]}" style="width:100%;font-family:{FONTS[lang]};font-size:7.5pt;color:#6b7480;'
            f'padding:0 15mm;display:flex;justify-content:space-between;"><span>{left}</span><span>{right}</span></div>')


RENDER = r"""
const { chromium } = require('playwright');
const [,, htmlPath, pdfPath, footer] = process.argv;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + htmlPath, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, displayHeaderFooter: true,
                   headerTemplate: '<span></span>', footerTemplate: footer,
                   margin: { top: '14mm', bottom: '16mm', left: '15mm', right: '15mm' } });
  await browser.close();
})();
"""


def main(langs):
    tmp = SRC / ".build"
    tmp.mkdir(exist_ok=True)
    (tmp / "render.js").write_text(RENDER)
    for lang in langs:
        cv = yaml.safe_load((SRC / f"cv_{lang}.yml").read_text(encoding="utf-8"))
        page = tmp / f"cv_{lang}.html"
        page.write_text(build_html(cv), encoding="utf-8")
        pdf = OUT / f"Sana_Ullah_Khan_CV_{lang}.pdf"
        subprocess.run(["node", str(tmp / "render.js"), str(page), str(pdf), footer(cv)], check=True)
        print("wrote", pdf.relative_to(ROOT))


if __name__ == "__main__":
    main(sys.argv[1:] or ["de", "zh", "ur"])
