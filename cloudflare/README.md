# Hosting on Cloudflare

The website is built by GitHub Actions and served by Cloudflare, so a change is live a few seconds after it reaches
`main`. On GitHub Pages it took up to 10 minutes, because GitHub tells browsers and its servers to keep each page
for 10 minutes (`Cache-Control: max-age=600`). Cloudflare swaps the whole site at once on every upload and tells
browsers to check for a newer version on each visit, so there is nothing to purge and nothing to wait for.

How it works:

1. `.github/workflows/deploy-site.yml` runs on every push to `main`, after the daily Security news update, or by hand.
2. It builds the site with Jekyll (the same versions as GitHub Pages, from `Gemfile.lock`) into `_site/`.
3. `npx wrangler deploy` (this folder) uploads `_site/` as the static files of a Worker named `sanaullahniazi-site`.
   Serving static files is free and unlimited on Cloudflare's free plan. No code runs for normal pages.
4. The workflow then opens `/version.txt` on the site and checks it shows the commit it just built.

Settings are in `wrangler.toml`: the 404 page, `/page` redirecting to `/page/` like on GitHub Pages, and
`src/index.js`, which keeps Google's verification file answering at its exact `.html` address.

Security headers (HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy and the `frame-ancestors`
part of the Content-Security-Policy) are in `_headers` at the top of the repository. Jekyll copies it into `_site/`,
and Cloudflare reads it on upload and adds those headers to every file. The file itself isn't served.

It uses the same `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets as the website checker.

`www/` is a second, tiny Worker that sends `www.sanaullahniazi.com` to `sanaullahniazi.com` with a permanent redirect.

## Moving sanaullahniazi.com over (done once)

The Cloudflare copy was first tested at new.sanaullahniazi.com while GitHub Pages kept serving the domain. To switch,
the DNS records that pointed to GitHub were deleted in **Cloudflare → sanaullahniazi.com → DNS → Records** (the `A`
records `185.199.108.153` to `185.199.111.153`, any `AAAA` records `2606:50c0:…`, and the `www` `CNAME` to
`sanaullah-niazi.github.io`), and the next deploy created the new ones. The leftover `new` record can be deleted too.

To go back to GitHub Pages, delete the two Workers' custom domains (Workers & Pages → the Worker → Settings → Domains)
and add GitHub's records again.
