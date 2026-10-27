# Free security tools

14 small security and developer tools that run entirely in your browser. Nothing you paste is uploaded:
passwords, tokens, photos and files stay on your device.

**Try them live:** [sanaullahniazi.com/tools](https://sanaullahniazi.com/tools/) (English, Deutsch, اردو, 中文)

![Password strength checker](screenshots/password-strength-checker.jpg)

## The tools

### Security

| Tool | What it does |
|---|---|
| [Password strength checker](https://sanaullahniazi.com/tools/password-strength-checker/) | Estimates how long a password would take to crack, and explains why: common words, names with numbers, keyboard patterns, dates. |
| [Leaked password checker](https://sanaullahniazi.com/tools/leaked-password-checker/) | Checks Have I Been Pwned with k-anonymity: only the first 5 characters of the SHA-1 hash leave the browser. |
| [Password and passphrase generator](https://sanaullahniazi.com/tools/password-generator/) | Uses `crypto.getRandomValues` and the EFF short word list. |
| [Phishing link checker](https://sanaullahniazi.com/tools/phishing-link-checker/) | Shows where a link really goes and flags fake brand domains, look-alike spellings, redirects and shorteners, without opening it. |
| [Lookalike domain checker](https://sanaullahniazi.com/tools/lookalike-domain-checker/) | Finds homograph attacks (Cyrillic and Greek letters, punycode) and typosquats of a domain. |
| [Photo metadata remover](https://sanaullahniazi.com/tools/photo-metadata-remover/) | Shows the GPS location, date and camera details hidden in a photo's EXIF data and saves a clean copy. |
| [Hidden text detector](https://sanaullahniazi.com/tools/hidden-text-detector/) | Finds zero-width characters, Unicode tag characters and bidi overrides used for prompt injection, and decodes hidden messages. |
| [Hash generator](https://sanaullahniazi.com/tools/hash-generator/) | MD5, SHA-1, SHA-256, SHA-384 and SHA-512 for text and files, and checksum verification. |
| [JWT decoder](https://sanaullahniazi.com/tools/jwt-decoder/) | Decodes a JSON Web Token and warns about `alg: none`, missing expiry and secrets in the payload. |

### Developer

| Tool | What it does |
|---|---|
| [JSON formatter](https://sanaullahniazi.com/tools/json-formatter/) | Pretty-prints, minifies and validates JSON, with the exact line and column of errors. |
| [Base64 encoder and decoder](https://sanaullahniazi.com/tools/base64-encoder-decoder/) | UTF-8 safe, URL-safe option, files and data URIs. |
| [URL encoder and decoder](https://sanaullahniazi.com/tools/url-encoder-decoder/) | Percent-encoding and a breakdown of every query parameter. |
| [Unix timestamp converter](https://sanaullahniazi.com/tools/unix-timestamp-converter/) | Detects seconds, milliseconds, microseconds and nanoseconds. |
| [UUID generator](https://sanaullahniazi.com/tools/uuid-generator/) | Random v4 and time-ordered v7, up to 500 at once, plus a UUID inspector. |

The [Website health and security checker](https://github.com/Sanaullah-Niazi/website-health-checker) has its own repository.

## How it's built

No frameworks and no build step: plain JavaScript and the Web Crypto API.

| Path | Contents |
|---|---|
| `assets/js/tools.js` | The logic of every tool. |
| `assets/js/eff-short-words.js` | The EFF short word list for passphrases. |
| `_includes/tools/<key>.html` | Each tool's HTML. |
| `_data/tools.yml`, `_data/<lang>/tools.yml` | All the text, in English, German, Urdu and Chinese. |
| `_data/tool_list.yml` | The list of tools and their addresses. |
| `tools/`, `de/`, `ur/`, `zh/` | The page of each tool (Jekyll front matter: title, description). |
| `screenshots/` | Preview images. |

The pages are built with [Jekyll](https://jekyllrb.com/) on GitHub Pages as part of my website.

## How this repository is kept up to date

This repository is an automatic mirror. The main copy lives in my website repository,
[Sanaullah-Niazi/portfolio](https://github.com/Sanaullah-Niazi/portfolio), and a GitHub Action copies these
files here every time the website changes. Please open an issue here for bugs or ideas: pull requests
can't be merged in this repository, because the next sync would overwrite them. I'll make the fix on the
website and it will show up here within minutes.

## License

[MIT](LICENSE) © Sana Ullah Khan. The website itself, its design and its other content are not covered by
this license.
