# Sana Ullah Khan · personal website

Live at **https://sanaullahniazi.com/**

This site is built with [Jekyll](https://jekyllrb.com), which GitHub Pages runs for you. You never need to touch HTML to update it: all the content lives in small text files. Edit them on github.com (open the file, click the pencil icon, then **Commit changes**) and the site updates by itself within a minute or two.

## Where everything lives

| To change… | Edit this file |
|---|---|
| Name, the big statement at the top (`hero_title`; words in [square brackets] are highlighted), email, links, highlight bar | `_data/profile.yml` |
| "Where I fit" areas | `_data/focus.yml` |
| Thesis and research interests | `_data/research.yml` |
| Publications (summary, abstract, PDF link; BibTeX is made for you) | `_data/publications.yml` |
| News strip on the home page | `_data/news.yml` |
| ORCID link | `orcid:` in `_data/profile.yml` |
| Teaching, reviewing and volunteering | `_data/service.yml` |
| Awards | `_data/awards.yml` |
| Skills chart (how far each point reaches) | `score:` in `_data/focus.yml` |
| Menu, headings and button text | `_data/strings.yml` (English); translations in `_data/ur/`, `_data/de/`, `_data/zh/` |
| Teaching and work | `_data/experience.yml` |
| Degrees | `_data/education.yml` |
| Certifications (verification links and pictures) | `_data/certifications.yml` |
| Skills | `_data/skills.yml` |
| The "About" story, the path next to it and the facts below it | `_data/about.yml` |
| Projects | one file per project in `_projects/` |
| Notes / blog posts | one file per post in `_posts/` |
| Tools (`/tools/` and one page per tool, e.g. `/tools/json-formatter/`) | the list and page addresses in `_data/tool_list.yml`; text, guides and FAQs in `_data/tools.yml` and `_data/<code>/tools.yml`; each tool's markup in `_includes/tools/<key>.html`, the pages in `_includes/pages/tools.html` (hub) and `_includes/pages/tool.html`; the code in `assets/js/tools.js`. Everything runs in the visitor's browser; the only outside request is the leaked password checker, which sends 5 characters of a SHA-1 hash to the Pwned Passwords API. To add a tool, add it to `tool_list.yml`, add its text, markup and a page file under `tools/<slug>/` (and `ur/`, `de/`, `zh/`) with its own title and description |
| YouTube tools (`/tools/youtube/`: tag extractor, transcript extractor, channel keywords, keyword ideas, thumbnail downloader) | listed in `_data/tool_list.yml` with `group: youtube`; text in the `yt*` keys of `_data/tools.yml` and `_data/<code>/tools.yml`; markup in `_includes/tools/yt*.html`; the code in `assets/js/youtube.js`. They look things up through the Worker in `worker/` (`worker/src/yt.js`), which needs a YouTube Data API key: see "YouTube tools" in `worker/README.md`. There's deliberately no video downloader (it breaks YouTube's terms) |
| Security news page (`/security-news/`) | updates itself every day, see "Security news" below; the news sources are listed at the top of `scripts/security_news.py` |

Files ending in `.yml` are lists. Copy an existing entry (everything from its `-` line down), paste it, and change the text. Keep the same indentation (spaces, not tabs).

Some entries (focus areas, skill groups, certification groups) have an `icon:` line. The names you can use are listed in `_includes/icon.html` (for example `shield`, `brain`, `radar`, `lock`, `code`, `chip`, `award`). A project can set `icon:` the same way.

## Add a project

1. Copy `templates/project-template.md`.
2. Create a new file in `_projects/`, for example `_projects/log-anomaly-detector.md`, and paste it in.
3. Fill in the title, summary, status (`In progress` or `Completed`), tech and links. Leave a link as `""` if you don't have it yet; empty links are hidden.
4. To show a live app inside the project page, put its URL in `demo_embed` (a Hugging Face Space, a Streamlit app, or your own subdomain like `https://demo.yourdomain.com`).
5. To show a YouTube video, put only the video ID in `youtube_id` (the part after `v=` in the link).
6. Write the details below the second `---` line.

The project gets its own page at `/projects/<file-name>/` and a card on the home page.

## Research page

`/research/` lists the thesis and every paper with its summary, keywords, DOI, PDF and a BibTeX citation visitors can copy. A file with all citations is built at `/research/papers.bib`. To show the journal's official abstract instead of the short summary, paste it after `abstract:` for that paper. To host a PDF yourself, upload it to `assets/papers/` and set `pdf: /assets/papers/your-file.pdf`.

## Certificate pictures

Upload a picture of a certificate to `assets/img/certificates/` and write its file name after `image:` for that certificate in `_data/certifications.yml` (or for an award in `_data/awards.yml`). Visitors can click it to see it larger. Without a picture, the gallery shows a badge instead. Crop out ID numbers or anything private first.

## Project topics

Each project file has a `topics:` line, for example `topics: [AI, Security]`. The filter buttons above the projects are built from these, so a new topic gets its own button automatically. Add a matching `topic_Name:` line to `_data/strings.yml` and to `strings.yml` in `_data/ur/`, `_data/de/` and `_data/zh/` for its translated label.

## Languages (English, Urdu, German, Chinese)

Every page exists in four languages. English is at the normal address (`/`, `/research/` …) and the translations live under `/ur/`, `/de/` and `/zh/` (Simplified Chinese). The globe menu in the header takes visitors to the same page in the other language, and Urdu pages are laid out right-to-left. Paper titles, the thesis title and certificate names stay in their official English everywhere.

- **Text:** each language has a folder in `_data/` (`_data/ur/`, `_data/de/`, `_data/zh/`) with the same file names as the English files in `_data/` (`profile.yml`, `news.yml`, `experience.yml` …). When you change something in English, make the same change in those three folders. `strings.yml` holds the menu, headings and buttons; change the text after the colon, never the key before it. `papers.yml` holds the translated summary and keywords of each paper.
- **Pages:** the small files in the `ur/`, `de/` and `zh/` folders only say which language a page is in. The page layouts themselves are shared and live in `_includes/pages/`.
- **A translated project or note:** copy an existing one from `de/projects/` or `de/blog/2026/`, keep `layout`, `lang`, `locale` and `ref` (`ref` is the English file name without `.md`, or the English post's file name without the date and `.md`), change `permalink` to match, and translate the title, summary or description, tags and text. Links, tech stack and status always come from the English project file. A project or note without a translation is still listed, in English.

## Link previews

When someone shares a page on WhatsApp, LinkedIn or X they see `assets/img/social-card.png` (1200 × 630). To use a different picture, replace that file (same name and size), or give one page its own with `image: /assets/img/other.png` in its front matter.

## Write a note

Notes are meant for short write-ups on AI security (phishing, LLM security, what you learn from a project). Copy `templates/post-template.md` into `_posts/` and name it `YEAR-MONTH-DAY-title.md`, for example `_posts/2026-11-02-detecting-roman-urdu-scams.md`. Give each note a few `tags:` (topics); they show on the Notes page. The Notes section appears on the home page once the first post exists.

## Security news

The Security news page fills itself. Every morning (05:17 UTC) the "Security news" job in `.github/workflows/security-news.yml` runs `scripts/security_news.py`, which:

- reads the news feeds of The Hacker News, BleepingComputer, Krebs on Security, SecurityWeek, The Record, CISA, SANS ISC, the Google Security Blog and Schneier on Security, and keeps each story's headline, link, date and a short excerpt from the feed for 21 days (the full article always stays on the publisher's site);
- adds the flaws CISA added to its Known Exploited Vulnerabilities list in the last 30 days;
- saves it all in `_data/security_news.json`, commits it, and the site is published again.

To update it right away, open the repository's **Actions** tab, pick **Security news** and press **Run workflow**.

**AI daily brief.** The job also writes a short daily brief in its own words from the day's headlines, using Google's Gemini on its free tier. To turn it on, get a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (sign in with a Google account, no card needed), then add it to the repository as a secret called `GEMINI_API_KEY` (Settings > Secrets and variables > Actions > New repository secret). Each brief is saved in `_briefs/` (one file per day, shown at `/security-news/<date>/`), says that it was written by AI, and links to every story it used. If a model is busy or retired, the job tries the next one, and on a bad day it simply skips the brief; the headlines still update. If you'd rather have Claude write the briefs (paid, a few cents a day), add an `ANTHROPIC_API_KEY` secret instead. To remove a brief, delete its file from `_briefs/`.

## BPSC interview section

`/bpsc-interview/` (and `/ur/bpsc-interview/`) is free prep for the BPSC IT Teacher (BPS-17) interviews: question banks with model answers, search, sharing on WhatsApp, daily Pakistan and Balochistan news, flashcards and a mock interview, a personal "My list", and a question form that publishes nothing until it is approved. It is in English and Urdu only, has no ads, and holds nothing personal about the site's owner.

**Where the questions live.** One file per bank in `_data/bpsc/` (`general.yml`, `islamiat.yml`, `technical.yml`, `pakistan-history.yml`, `balochistan.yml`, `current-affairs.yml`). `banks.yml` lists the banks in order with their names, descriptions and categories, and `settings.yml` holds the interview dates shown at the top, the number of days a question counts as "New" and the spelling variants that search treats as the same word (Hazrat and Hz, Balochistan and Baluchistan...). Nothing is written into the pages by hand.

**One question** looks like this. Only `published` items are built into the site.

```yaml
- id: isl-001                  # never change or reuse it: it is in every link to the question
  bank: islamiat               # the file it is in
  category: Khulafa-e-Rashideen and after   # one of the bank's categories in banks.yml
  question: Who was the first Caliph of Islam?
  answer: |                    # Markdown. Empty = "Answer coming soon"
    Hazrat Abu Bakr Siddiq (RA), 632 to 634 CE...
  personal: false              # true = a question about the candidate: the page says "Prepare your own answer"
  frequency: 3                 # 1 to 3 stars; 3 = asked very often ("Most asked" on the landing page)
  tags: [caliphs]
  sources: ["https://..."]     # where the answer was checked
  verified_on: 2026-11-24      # when it was last checked
  check_again: false           # true = a fact that changes: shows "May have changed, check before your interview"
  status: published            # or draft, to hide it
  added: 2026-11-25            # shown as "New" for 7 days
```

Optional fields: `question_ur` and `answer_ur` (shown on the Urdu pages, otherwise the English text is used), `short_answer` (one or two lines for quick revision) and `asked_in` (zones or districts; adds an "Asked in my zone" filter).

**How the pages are made.** GitHub Pages' Jekyll can't run plugins, so `scripts/bpsc_pages.rb` writes one small page file per bank and per question into `_bpsc/` (git ignores it) before each build; the deploy workflow runs it. The text comes from `_includes/pages/bpsc-home.html`, `bpsc-bank.html` and `bpsc-question.html`; the page code is `assets/js/bpsc.js`; the search index is built at `/bpsc-interview/index.json` and only downloaded when someone starts searching. Interface text is in `_data/strings.yml` and `_data/ur/strings.yml` (keys starting with `bp_`).

**Checks.** Every pull request that changes `_data/bpsc/` runs `scripts/bpsc_validate.py` (workflow "BPSC banks check"). It fails on broken YAML, missing fields, unknown banks or categories, duplicate or removed ids, a published `[Check]` note, a new answer without sources, and any word from the private list in the `BPSC_BLOCKED_TERMS` repository secret (names and family details that must never be public; one per line). Run it yourself with `python3 scripts/bpsc_validate.py`.

**Daily news.** `scripts/pk_news.py` (workflow "PK news", every day at 01:30 UTC) reads the RSS feeds of Dawn, The Express Tribune, APP and Business Recorder, and keeps only each story's headline, link, source, date and the feed's own short excerpt for 60 days in `_data/pk_news.json`. It never opens or copies the articles. It tags stories by topic, puts Balochistan first, and merges the same story from several papers. With a `GEMINI_API_KEY` (or `ANTHROPIC_API_KEY`) secret it also writes a short brief in its own words with possible viva questions in `_pk_briefs/`; with a `BPSC_SUBMISSIONS_TOKEN` secret those questions also go to the review queue as `ai-suggested` issues. The page is `/bpsc-interview/news/`. A pull request that changes the script runs "PK news feed check" (`python3 scripts/pk_news.py --check`), which tests each feed, whether its stories are fresh, and a few story links.

**Practice and My list.** `/bpsc-interview/practice/` (flashcards and a 10-question mock interview with a timer) and `/bpsc-interview/my-list/` (starred questions) run in the browser from the search index; stars and progress stay in the visitor's local storage (`assets/js/bpsc-tools.js`).

**The question form and approval.** `/bpsc-interview/submit/` sends to the Worker route `POST /bpsc/submit` (`worker/src/bpsc.js`): Turnstile, 5 per visitor per day, HTML, phone numbers, emails and CNIC numbers removed, then an issue in the private repository `Sanaullah-Niazi/bpsc-submissions` with the Worker secret `BPSC_GITHUB_TOKEN`. Adding the label `approved` there runs its workflow (copy it from `templates/bpsc-submissions/`), which uses `scripts/bpsc_from_issue.py` to open a pull request in this repository with the exact text; merging it publishes the question, and "BPSC published" comments the link on the issue and closes it. Setup steps are in `templates/bpsc-submissions/README.md`.

Secrets: `BPSC_GITHUB_TOKEN` (Worker), `PORTFOLIO_TOKEN` (in bpsc-submissions), `BPSC_SUBMISSIONS_TOKEN` and `BPSC_BLOCKED_TERMS` (this repository), `GEMINI_API_KEY` (optional, for the brief). None of them is ever in a file.

**From a spreadsheet.** `python3 scripts/bpsc_import.py questions.csv` adds or updates items from a CSV with the same column names (separate several tags, zones or sources with `|`).

**Preview drafts on your own computer.** `ruby scripts/bpsc_pages.rb --drafts && bundle exec jekyll serve --config _config.yml,_config_bpsc_drafts.yml`. Without `--drafts`, run `ruby scripts/bpsc_pages.rb` once before `jekyll serve`.

## Tool repositories

The tools also live in their own public repositories, so each one shows on the GitHub profile:
[free-security-tools](https://github.com/Sanaullah-Niazi/free-security-tools),
[website-health-checker](https://github.com/Sanaullah-Niazi/website-health-checker),
[security-learning-roadmaps](https://github.com/Sanaullah-Niazi/security-learning-roadmaps) and
[security-news-bot](https://github.com/Sanaullah-Niazi/security-news-bot). They're MIT licensed.

This repository stays the main copy. After every change here, `.github/workflows/sync-tool-repos.yml` copies the
right files into each of them (the list is in `scripts/sync_mirrors.py`, their READMEs in `mirrors/<repo>/README.md`).
Always edit here: changes made directly in a tool repository are overwritten by the next sync.

It needs a repository secret named `SYNC_TOKEN`: a fine-grained personal access token with
**Contents: Read and write** on the four tool repositories. To sync right away, open **Actions**, pick
**Sync tool repos** and press **Run workflow**.

## Turn on the contact form

Messages sent from the form arrive in your inbox through [Web3Forms](https://web3forms.com) (free, 250 messages a month), without opening the visitor's email app. To turn it on, go to web3forms.com, enter your email under **Create your Access Key**, copy the key they email you and paste it into `web3forms_access_key` in `_config.yml`. The key is designed to be public, so it's fine in this repo. Replies go straight to the visitor, because their address is set as the reply-to. Spam is filtered by Web3Forms plus a hidden honeypot field.

## Your domain

The site is served at `sanaullahniazi.com` (registered and DNS-managed on Cloudflare). The domain is set in the `CNAME` file and in `url` in `_config.yml`, with `baseurl` left empty. If you ever change domains, update both. If you'd rather host somewhere else (Netlify, Cloudflare Pages), connect this repo there and choose Jekyll as the framework.

## Accessibility

The site is checked with axe (an automated accessibility tester) in light and dark mode and in every language. Everything works with a keyboard (Tab, Enter, Esc), there is a "Skip to content" link, images and icons have text alternatives, colours meet WCAG AA contrast, and animations stop for visitors who ask their device for reduced motion. When you add a certificate picture, its description is made from the certificate name automatically.

## Security

- `_includes/head.html` sets a Content Security Policy: only the site's own scripts run, styles and fonts come only from Google Fonts, and the contact form can only send to Web3Forms. If you add a new outside service (an analytics script, a widget), add its domain there or it will be blocked.
- `.well-known/security.txt` tells people how to report a security problem. Change the `Expires` date before it passes (once a year).
- `demo_embed` iframes are sandboxed, so an embedded app can't take over the page.

## Copyright

All content and code here is © Sana Ullah Khan, all rights reserved (see `LICENSE`). The repo is public only so GitHub Pages can host it for free; that does not give anyone permission to copy or reuse it. The footer of every page shows the same notice.

## Preview on your own computer (optional)

```
bundle install
ruby scripts/bpsc_pages.rb
bundle exec jekyll serve
```
Then open http://localhost:4000/.
