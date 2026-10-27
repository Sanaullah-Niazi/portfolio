# Fonts

Served from the site itself instead of Google Fonts (the `@font-face` rules are at the top of `assets/css/main.css`).
Downloaded as WOFF2 (Google Fonts / Fontsource), keeping only the latin, latin-ext and arabic subsets:

- Space Grotesk (500, 600, 700) for headings, Inter (400, 500, 600) for text, JetBrains Mono (400, 500) for labels,
  Noto Nastaliq Urdu (400, 600)

All four are under the SIL Open Font License 1.1 (https://openfontlicense.org). `_headers` lets browsers cache this
folder for a year, so a changed font must get a new file name.
