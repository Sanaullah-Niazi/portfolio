# Security learning roadmaps

Free, step-by-step learning roadmaps for computer science and cybersecurity, written as plain data so
they're easy to read, fix and reuse. Each stage has a project and free resources from universities and
official sources.

**Read them live:** [sanaullahniazi.com/roadmaps](https://sanaullahniazi.com/roadmaps/) (English, Deutsch, اردو, 中文)

## What's inside

| Roadmap | Data file | Live page |
|---|---|---|
| Computer science: foundations, web, cybersecurity, AI and ML, data, cloud and DevOps | `_data/roadmaps.yml` | [/roadmaps/](https://sanaullahniazi.com/roadmaps/) |
| Certification roadmaps: which certifications to take and in what order, with costs, exam formats and validity | `_data/cert_roadmaps.yml` | [/roadmaps/certifications/](https://sanaullahniazi.com/roadmaps/certifications/) |
| Cybersecurity and AI security careers, from Beginner to Expert | `_data/sec_roadmaps.yml` | [/roadmaps/security/](https://sanaullahniazi.com/roadmaps/security/) |
| Security operations, network, application, cloud, identity and DFIR deep dives | `_data/sec_domains/*.yml` | [/roadmaps/security/](https://sanaullahniazi.com/roadmaps/security/) |
| Security frameworks (NIST CSF, ISO 27001, MITRE ATT&CK and more) | `_data/sec_frameworks.yml` | [/roadmaps/security/frameworks/](https://sanaullahniazi.com/roadmaps/security/frameworks/) |

Translations are in `_data/de/`, `_data/ur/` and `_data/zh/`. The page templates that turn the data into
web pages are in `_includes/pages/`, and `ci/check-roadmap-links.yml` checks every link once a week so
broken resources get fixed quickly.

Found a broken link or a better free resource? Please open an issue.

## How this repository is kept up to date

This repository is an automatic mirror. The main copy lives in my website repository,
[Sanaullah-Niazi/portfolio](https://github.com/Sanaullah-Niazi/portfolio), and a GitHub Action copies these
files here every time the website changes. Please open an issue here for bugs or ideas: pull requests
can't be merged in this repository, because the next sync would overwrite them. I'll make the fix on the
website and it will show up here within minutes.

## License

[MIT](LICENSE) © Sana Ullah Khan. The website itself, its design and its other content are not covered by
this license.
