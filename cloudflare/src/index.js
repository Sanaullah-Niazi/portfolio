// Only runs for the addresses listed under run_worker_first in wrangler.toml; every other file is served directly.
// Cloudflare normally answers /page.html with a redirect to /page. Google's verification file has to answer at its
// exact .html address, so serve it there without the redirect.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.endsWith(".html")) url.pathname = url.pathname.slice(0, -".html".length);
    return env.ASSETS.fetch(new Request(url, request));
  },
};
