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

It uses the same `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets as the website checker.

## Moving sanaullahniazi.com over (once)

While GitHub Pages still serves sanaullahniazi.com, the Cloudflare copy answers at https://new.sanaullahniazi.com
so it can be checked first. To switch:

1. In the Cloudflare dashboard, open **sanaullahniazi.com → DNS → Records** and delete the records that point to
   GitHub: the `A` records for `sanaullahniazi.com` (`185.199.108.153` to `185.199.111.153`), any `AAAA` records for it
   (`2606:50c0:8000::153` and similar), and the `CNAME` for `www` (`sanaullah-niazi.github.io`).
   Leave every other record alone (`api`, `new`, the MX and TXT records for email, Google and Bing).
2. Right after, merge the "switch" pull request (it points `routes` in `wrangler.toml` at `sanaullahniazi.com` and
   sends `www.sanaullahniazi.com` there with a permanent redirect). Its deploy creates the new DNS records itself. The site is unreachable for a minute
   or two in between.
3. Once it answers, GitHub Pages can be turned off (repository **Settings → Pages**), or left on as a spare copy.
