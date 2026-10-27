# Fonts

Served from the site itself instead of Google Fonts (the `@font-face` rules are at the top of `assets/css/main.css`).
Downloaded from Google Fonts as WOFF2, keeping only the latin, latin-ext and arabic subsets:

- Fraunces (600), IBM Plex Sans (400, 500, 600), IBM Plex Mono (400, 500), Noto Nastaliq Urdu (400, 600)

All four are under the SIL Open Font License 1.1 (https://openfontlicense.org). `_headers` lets browsers cache this
folder for a year, so a changed font must get a new file name.
