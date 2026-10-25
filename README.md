# Sana Ullah Khan · personal website

Live at **https://sanaullahniazi.com/**

This site is built with [Jekyll](https://jekyllrb.com), which GitHub Pages runs for you. You never need to touch HTML to update it: all the content lives in small text files. Edit them on github.com (open the file, click the pencil icon, then **Commit changes**) and the site updates by itself within a minute or two.

## Where everything lives

| To change… | Edit this file |
|---|---|
| Name, headline, intro, email, links, highlight strip | `_data/profile.yml` |
| "Where I fit" areas | `_data/focus.yml` |
| Thesis and research interests | `_data/research.yml` |
| Publications | `_data/publications.yml` |
| Teaching and work | `_data/experience.yml` |
| Degrees | `_data/education.yml` |
| Certifications (and verification links) | `_data/certifications.yml` |
| Skills | `_data/skills.yml` |
| The "About" story | `index.html`, the section that starts with `id="about"` |
| Projects | one file per project in `_projects/` |
| Notes / blog posts | one file per post in `_posts/` |

Files ending in `.yml` are lists. Copy an existing entry (everything from its `-` line down), paste it, and change the text. Keep the same indentation (spaces, not tabs).

## Add a project

1. Copy `templates/project-template.md`.
2. Create a new file in `_projects/`, for example `_projects/log-anomaly-detector.md`, and paste it in.
3. Fill in the title, summary, status (`In progress` or `Completed`), tech and links. Leave a link as `""` if you don't have it yet; empty links are hidden.
4. To show a live app inside the project page, put its URL in `demo_embed` (a Hugging Face Space, a Streamlit app, or your own subdomain like `https://demo.yourdomain.com`).
5. To show a YouTube video, put only the video ID in `youtube_id` (the part after `v=` in the link).
6. Write the details below the second `---` line.

The project gets its own page at `/projects/<file-name>/` and a card on the home page.

## Write a note

Copy `templates/post-template.md` into `_posts/` and name it `YEAR-MONTH-DAY-title.md`, for example `_posts/2026-11-02-detecting-roman-urdu-scams.md`. The Notes section appears on the home page once the first post exists.

## Add your CV

Save a public version of your CV as `assets/cv/Sana_Ullah_Khan_CV.pdf` (on github.com: open the `assets/cv` folder, **Add file → Upload files**). The "Download CV" button appears automatically once the file is there. Remove your phone number, address, date of birth, school results and referees' contact details from that version first, because anyone can download it.

## Turn on the contact form

The form works straight away by opening the visitor's email app. To receive messages directly instead, create a free form at [formspree.io](https://formspree.io), copy its endpoint (like `https://formspree.io/f/abcdwxyz`) and paste it into `contact_form_endpoint` in `_config.yml`.

## Your domain

The site is served at `sanaullahniazi.com` (registered and DNS-managed on Cloudflare). The domain is set in the `CNAME` file and in `url` in `_config.yml`, with `baseurl` left empty. If you ever change domains, update both. If you'd rather host somewhere else (Netlify, Cloudflare Pages), connect this repo there and choose Jekyll as the framework.

## Preview on your own computer (optional)

```
bundle install
bundle exec jekyll serve
```
Then open http://localhost:4000/.
