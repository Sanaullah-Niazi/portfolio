// Runs for the addresses listed under run_worker_first in wrangler.toml (every page, not the files under /assets/).
// 1. http:// gets a permanent redirect to https://. Cloudflare's "Always Use HTTPS" should do this too, but the
//    website checker still saw http:// answer with the page, so the site does it itself.
// 2. Cloudflare normally answers /page.html with a redirect to /page. Google's verification file has to answer at its
//    exact .html address, so serve it there without the redirect.
const GOOGLE_FILE = "/google68fd583c48fd5ed6.html";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.protocol === "http:") {
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname === GOOGLE_FILE) {
      url.pathname = url.pathname.slice(0, -".html".length);
      return env.ASSETS.fetch(new Request(url, request));
    }
    return env.ASSETS.fetch(request);
  },
};
