# Sana Ullah Khan · personal website

Live at **https://sanaullahniazi.com/**

This site is built with [Jekyll](https://jekyllrb.com), which GitHub Pages runs for you. You never need to touch HTML to update it: all the content lives in small text files. Edit them on github.com (open the file, click the pencil icon, then **Commit changes**) and the site updates by itself within a minute or two.

## Where everything lives

| To change… | Edit this file |
|---|---|
| Name, headline, intro, email, links, highlight strip | `_data/profile.yml` |
| "Where I fit" areas | `_data/focus.yml` |
| Thesis and research interests | `_data/research.yml` |
| Publications (summary, abstract, PDF link; BibTeX is made for you) | `_data/publications.yml` |
| News strip on the home page | `_data/news.yml` |
| ORCID link | `orcid:` in `_data/profile.yml` |
| Teaching, reviewing and volunteering | `_data/service.yml` |
| Awards | `_data/awards.yml` |
| Skills chart (how far each point reaches) | `score:` in `_data/focus.yml` |
| Text for the language menu | `_data/ur.yml` (Urdu), `_data/de.yml` (German), `_data/zh.yml` (Chinese) |
| Teaching and work | `_data/experience.yml` |
| Degrees | `_data/education.yml` |
| Certifications (verification links and pictures) | `_data/certifications.yml` |
| Skills | `_data/skills.yml` |
| The "About" story and the path next to it | `index.html`, the section that starts with `id="about"` |
| The terminal box in the top section | `index.html`, the part that starts with `class="terminal"` |
| Projects | one file per project in `_projects/` |
| Notes / blog posts | one file per post in `_posts/` |

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

Each project file has a `topics:` line, for example `topics: [AI, Security]`. The filter buttons above the projects are built from these, so a new topic gets its own button automatically. Add a matching `topic_Name:` line to `_data/ur.yml`, `de.yml` and `zh.yml` for its translated label.

## Language menu (English, Urdu, German, Chinese)

The globe menu in the header switches the menu, headings, buttons and the short intro to Urdu, German or Simplified Chinese. Urdu also turns the layout right-to-left. The visitor's choice is remembered. Detailed content (papers, projects, CV entries) stays in English, and a one-line note at the top says so. The text for each language lives in `_data/ur.yml`, `_data/de.yml` and `_data/zh.yml`; change the text in quotes, not the key before the colon. A key missing from a file simply shows in English.

## Link previews

When someone shares a page on WhatsApp, LinkedIn or X they see `assets/img/social-card.png` (1200 × 630). To use a different picture, replace that file (same name and size), or give one page its own with `image: /assets/img/other.png` in its front matter.

## Write a note

Notes are meant for short write-ups on AI security (phishing, LLM security, what you learn from a project). Copy `templates/post-template.md` into `_posts/` and name it `YEAR-MONTH-DAY-title.md`, for example `_posts/2026-11-02-detecting-roman-urdu-scams.md`. Give each note a few `tags:` (topics); they show on the Notes page. The Notes section appears on the home page once the first post exists.

## Add your CV

Save a public version of your CV as `assets/cv/Sana_Ullah_Khan_CV.pdf` (on github.com: open the `assets/cv` folder, **Add file → Upload files**). The "Download CV" button appears automatically once the file is there. Remove your phone number, address, date of birth, school results and referees' contact details from that version first, because anyone can download it.

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
bundle exec jekyll serve
```
Then open http://localhost:4000/.
