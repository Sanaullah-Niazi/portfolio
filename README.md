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

Messages sent from the form arrive in your inbox through [Web3Forms](https://web3forms.com) (free, 250 messages a month), without opening the visitor's email app. To turn it on, go to web3forms.com, enter your email under **Create your Access Key**, copy the key they email you and paste it into `web3forms_access_key` in `_config.yml`. The key is designed to be public, so it's fine in this repo. Replies go straight to the visitor, because their address is set as the reply-to. Spam is filtered by Web3Forms plus a hidden honeypot field.

## Your domain

The site is served at `sanaullahniazi.com` (registered and DNS-managed on Cloudflare). The domain is set in the `CNAME` file and in `url` in `_config.yml`, with `baseurl` left empty. If you ever change domains, update both. If you'd rather host somewhere else (Netlify, Cloudflare Pages), connect this repo there and choose Jekyll as the framework.

## Security

- `_includes/head.html` sets a Content Security Policy: only the site's own scripts run, styles and fonts come only from Google Fonts, and the contact form can only send to Web3Forms. If you add a new outside service (an analytics script, a widget), add its domain there or it will be blocked.
- `.well-known/security.txt` tells people how to report a security problem. Change the `Expires` date before it passes (once a year).
- `demo_embed` iframes are sandboxed, so an embedded app can't take over the page.

## Preview on your own computer (optional)

```
bundle install
bundle exec jekyll serve
```
Then open http://localhost:4000/.
