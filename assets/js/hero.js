// Home page hero: thousands of small dots draw Sana's portrait. Moving the pointer through them scatters the dots,
// and they pull back into place; the buttons under the headline rebuild the same dots into a word ("Sana", "ثناء",
// "你好", "Hallo"). Plain canvas 2D, no libraries. Loaded only on the home pages (page.scripts).
// Skipped entirely when there is no canvas; drawn once and left still when the visitor prefers reduced motion.
(function () {
  var stage = document.querySelector("[data-particles]");
  if (!stage) return;
  var canvas = stage.querySelector("canvas");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, N = 0, P = [], targets = {}, current = "face", raf = 0, running = false, visible = true;
  var mouse = { x: -1e4, y: -1e4 };
  var img = new Image();
  img.decoding = "async";
  img.src = stage.getAttribute("data-photo");

  function size() {
    var r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    N = Math.round(Math.min(14000, Math.max(4000, W * H / 40)));
  }

  // Picks N points from an offscreen drawing. weight(r, g, b, a) says how likely a pixel is to get a dot (0..1);
  // each point keeps its brightness so bright skin reads bright and shadows stay dark.
  function sample(draw, weight) {
    var s = 2, w = Math.max(1, Math.round(W / s)), h = Math.max(1, Math.round(H / s));
    var oc = document.createElement("canvas"); oc.width = w; oc.height = h;
    var o = oc.getContext("2d", { willReadFrequently: true });
    draw(o, w, h);
    var d = o.getImageData(0, 0, w, h).data, idx = [], cum = [], total = 0;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var i = (y * w + x) * 4, wt = weight(d[i], d[i + 1], d[i + 2], d[i + 3]);
      // A negative weight marks a dark feature (hair, beard): it gets dots at a fixed, softer brightness.
      if (wt !== 0) { total += Math.abs(wt); idx.push(wt < 0 ? -(i / 4) - 1 : i / 4); cum.push(total); }
    }
    var out = [];
    for (var n = 0; n < N; n++) {
      if (!idx.length) { out.push([W / 2, H / 2, 0.5]); continue; }
      var r = Math.random() * total, lo = 0, hi = cum.length - 1;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (cum[mid] < r) lo = mid + 1; else hi = mid; }
      var p = idx[lo], dark = p < 0; if (dark) p = -p - 1;
      var px = p % w, py = (p / w) | 0, k = p * 4;
      var lum = dark ? 0.32 : (d[k] * 0.3 + d[k + 1] * 0.55 + d[k + 2] * 0.15) / 255;
      out.push([(px + Math.random()) * s, (py + Math.random()) * s, lum]);
    }
    return out;
  }

  // The portrait sits in the right part of the stage (centred on phones). Bright cyan from the old illustration's
  // glow is left out, so only the person is drawn.
  function faceTarget() {
    return sample(function (o, w, h) {
      var side = Math.min(w * 0.95, h * 1.02), ox = (w - side) / 2, oy = h - side;
      var sw = img.naturalWidth, sh = img.naturalHeight;
      o.drawImage(img, sw * 0.17, sh * 0.04, sw * 0.66, sh * 0.66, ox, oy, side, side);
    }, function (r, g, b) {
      if (g > r + 40 && b > r + 40) return 0;            // cyan glow and shield
      if (b > r + 16) return 0;                          // blue background and the navy hoodie
      var lum = (r * 0.3 + g * 0.55 + b * 0.15) / 255;
      if (lum < 0.2) return r >= b - 4 && lum > 0.025 ? -0.3 : 0; // hair and beard: a dimmer, even layer of dots
      return Math.pow(lum, 1.5);
    });
  }
  function textTarget(txt, font) {
    return sample(function (o, w, h) {
      var fs = Math.min(h * 0.42, w / (Math.max(txt.length, 2) * 0.62));
      o.fillStyle = "#fff"; o.textAlign = "center"; o.textBaseline = "middle";
      o.font = font.replace("{s}", Math.round(fs));
      o.fillText(txt, w / 2, h * 0.52);
    }, function (r, g, b, a) { return a > 128 ? 0.6 + Math.random() * 0.4 : 0; });
  }

  function build() {
    size();
    targets = {};
    targets.face = img.complete && img.naturalWidth ? faceTarget() : textTarget("SANA", "700 {s}px Outfit, system-ui, sans-serif");
    while (P.length < N) P.push({ x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0 });
    P.length = N;
    if (current !== "face") targets[current] = morphTarget(current);
  }
  function morphTarget(key) {
    var btn = stage.querySelector('[data-morph="' + key + '"]');
    var word = btn ? btn.getAttribute("data-word") : "SANA";
    var font = /[\u0600-\u06ff]/.test(word) ? '{s}px "Noto Nastaliq Urdu", serif'
      : /[\u3400-\u9fff]/.test(word) ? '700 {s}px "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif'
      : '700 {s}px Outfit, system-ui, sans-serif';
    return textTarget(word, font);
  }

  // Colour: a soft sea-glass to lavender to peach sweep across the stage, brighter where the photo is brighter.
  var stops = [[143, 227, 207], [185, 166, 255], [242, 184, 162]];
  function colour(x, lum) {
    var t = Math.max(0, Math.min(1, x / W)), a = t < 0.5 ? stops[0] : stops[1], b = t < 0.5 ? stops[1] : stops[2], u = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    var k = 0.42 + lum * 0.9;
    return "rgb(" + Math.min(255, (a[0] + (b[0] - a[0]) * u) * k | 0) + "," + Math.min(255, (a[1] + (b[1] - a[1]) * u) * k | 0) + "," + Math.min(255, (a[2] + (b[2] - a[2]) * u) * k | 0) + ")";
  }

  function step() {
    ctx.clearRect(0, 0, W, H);
    var T = targets[current], R2 = 8100;
    for (var i = 0; i < N; i++) {
      var p = P[i], t = T[i], dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
      if (d2 < R2) { var f = (R2 - d2) / R2 * 3.6, d = Math.sqrt(d2) || 1; p.vx += dx / d * f; p.vy += dy / d * f; }
      p.vx += (t[0] - p.x) * 0.014; p.vy += (t[1] - p.y) * 0.014;
      p.vx *= 0.85; p.vy *= 0.85; p.x += p.vx; p.y += p.vy;
      ctx.fillStyle = colour(p.x, t[2]);
      var sz = 0.8 + t[2] * 0.85;
      ctx.fillRect(p.x, p.y, sz, sz);
    }
  }
  function loop() { step(); raf = requestAnimationFrame(loop); }
  function start() { if (running || reduce) return; running = true; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function settle() { var T = targets[current]; P.forEach(function (p, i) { p.x = T[i][0]; p.y = T[i][1]; p.vx = p.vy = 0; }); step(); }

  stage.addEventListener("pointermove", function (e) {
    var r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  stage.addEventListener("pointerleave", function () { mouse.x = mouse.y = -1e4; });

  stage.querySelectorAll("[data-morph]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      current = btn.getAttribute("data-morph");
      if (!targets[current]) targets[current] = morphTarget(current);
      stage.querySelectorAll("[data-morph]").forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      if (reduce) { settle(); return; }
      P.forEach(function (p) { p.vx += (Math.random() - 0.5) * 34; p.vy += (Math.random() - 0.5) * 34; });
    });
  });

  // Only animate while the hero is on screen and the tab is visible.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible && !document.hidden) start(); else stop(); }).observe(stage);
  }
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else if (visible) start(); });

  var resizeT;
  window.addEventListener("resize", function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () { var oldW = W; size(); if (Math.abs(W - oldW) > 40) { build(); if (reduce) settle(); } }, 200);
  });

  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  var imgReady = img.decode ? img.decode().catch(function () {}) : new Promise(function (res) { img.onload = img.onerror = res; });
  Promise.all([fontsReady, imgReady]).then(function () {
    build();
    stage.classList.add("is-live");
    if (reduce) settle(); else start();
  });
})();
