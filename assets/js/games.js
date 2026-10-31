// The games under /games/. Each game has its own page; this file runs whichever game is on the page.
// Everything runs in the browser and nothing is sent anywhere. The only thing kept is a game's best score,
// in this browser's localStorage. Text comes from the JSON block the page writes (_data/games.yml and its
// translations), and results are built with DOM nodes, never innerHTML.
(function () {
  "use strict";

  var root = document.documentElement, rtl = root.getAttribute("dir") === "rtl";

  function h(tag, attrs) {
    var el = document.createElement(tag);
    for (var k in attrs || {}) {
      if (attrs[k] === null || attrs[k] === undefined || attrs[k] === false) continue;
      if (k === "text") el.textContent = attrs[k]; else el.setAttribute(k, attrs[k]);
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c === null || c === undefined || c === false) continue;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return el;
  }
  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  // ================= How hackable are you? =================
  (function hack() {
    var box = document.getElementById("hack"), dataEl = document.getElementById("hack-data");
    if (!box || !dataEl) return;
    var DATA;
    try { DATA = JSON.parse(dataEl.textContent); } catch (e) { return; }
    var T = DATA.text, Q = T.hack_questions || [], P = DATA.points || [];
    var total = Q.length, answers = [], step = 0, BEST_KEY = "game-hack-best";
    var maxPts = 0;
    for (var i = 0; i < total; i++) maxPts += Math.max.apply(null, P[i].pts);

    // Inserted values are isolated in right-to-left text so numbers don't reorder the sentence.
    function tr(s, vars) {
      return String(s || "").replace(/\{(\w+)\}/g, function (m, k) {
        return vars && k in vars ? (rtl ? "⁨" + vars[k] + "⁩" : String(vars[k])) : m;
      });
    }
    function num(n) { return new Intl.NumberFormat(root.getAttribute("lang") || "en").format(n); }

    // A friend's score arrives in the link they shared: ?s=37
    var friend = null, m = /[?&]s=(\d{1,3})(?:&|$)/.exec(location.search);
    if (m && +m[1] <= 100) friend = +m[1];

    var intro = box.querySelector(".hack-intro");
    var startBtn = intro.querySelector('[data-act="start"]');
    if (friend !== null) {
      var fr = intro.querySelector(".hack-friend");
      fr.querySelector("span").textContent = tr(T.hack_friend, { score: num(friend) });
      fr.hidden = false;
    }
    var best = store(BEST_KEY);
    if (best !== null && /^\d{1,3}$/.test(best)) {
      var bp = intro.querySelector(".hack-best");
      bp.textContent = tr(T.hack_best, { score: num(+best) });
      bp.hidden = false;
    }
    startBtn.disabled = false;
    startBtn.addEventListener("click", function () { answers = []; step = 0; showQuestion(true); });

    function clear() { while (box.firstChild) box.removeChild(box.firstChild); }

    function showQuestion(focus) {
      clear();
      var q = Q[step];
      // Widths are set through el.style: the site's security policy blocks style="" attributes.
      var fill = h("span");
      fill.style.width = (step / total * 100) + "%";
      var bar = h("div", { class: "hack-progress", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(total), "aria-valuenow": String(step), "aria-label": tr(T.hack_q_of, { n: num(step + 1), total: num(total) }) }, fill);
      var head = h("div", { class: "hack-q-head" },
        h("span", { class: "label", text: tr(T.hack_q_of, { n: num(step + 1), total: num(total) }) }));
      if (step > 0) {
        var back = h("button", { class: "btn btn-sm hack-back", type: "button" }, T.hack_back);
        back.addEventListener("click", function () { step--; showQuestion(true); });
        head.appendChild(back);
      }
      var title = h("h2", { class: "hack-q", tabindex: "-1", id: "hack-q" }, q.q);
      var list = h("div", { class: "hack-opts", role: "group", "aria-labelledby": "hack-q" });
      q.a.forEach(function (text, idx) {
        var b = h("button", { class: "hack-opt" + (answers[step] === idx ? " is-picked" : ""), type: "button" },
          h("span", { class: "hack-key", "aria-hidden": "true", text: String.fromCharCode(65 + idx) }), h("span", { text: text }));
        b.addEventListener("click", function () { pick(idx, b); });
        list.appendChild(b);
      });
      box.appendChild(h("div", { class: "hack-question", "data-step": "q" }, bar, head, title, list));
      if (focus) title.focus({ preventScroll: true });
      if (focus && box.getBoundingClientRect().top < 0) box.scrollIntoView({ block: "start" });
    }

    var busy = false;
    function pick(idx, btn) {
      if (busy) return;
      busy = true;
      answers[step] = idx;
      btn.classList.add("is-picked");
      setTimeout(function () {
        busy = false;
        step++;
        if (step < total) showQuestion(true); else showResult();
      }, 220);
    }

    function scoreOf() {
      var pts = 0;
      for (var i = 0; i < total; i++) pts += P[i].pts[answers[i]] || 0;
      return Math.round(pts / maxPts * 100);
    }
    function tierOf(score) {
      var R = T.hack_results;
      for (var i = 0; i < R.length; i++) if (score <= R[i].max) return { i: i, r: R[i] };
      return { i: R.length - 1, r: R[R.length - 1] };
    }
    var COLORS = ["#34d399", "#22d3ee", "#facc15", "#fb923c", "#f87171"];

    function showResult() {
      var score = scoreOf(), tier = tierOf(score), r = tier.r, color = COLORS[tier.i] || COLORS[4];
      var prev = store(BEST_KEY);
      if (prev === null || !/^\d{1,3}$/.test(prev) || score < +prev) store(BEST_KEY, String(score));

      clear();
      var node = document.getElementById("hack-result-tpl").content.cloneNode(true);
      var res = node.querySelector(".hack-result");
      res.style.setProperty("--p", score);
      res.style.setProperty("--c", color);
      res.querySelector(".hack-num").textContent = num(score) + "%";
      res.querySelector(".hack-ring").setAttribute("aria-label", num(score) + "% " + T.hack_label);
      res.querySelector(".hack-title").textContent = r.title + " " + r.emoji;
      res.querySelector(".hack-text").textContent = r.text;
      if (friend !== null) {
        var vs = res.querySelector(".hack-vs");
        vs.textContent = tr(score < friend ? T.hack_beat : score > friend ? T.hack_lost : T.hack_tie, { score: num(friend) });
        vs.hidden = false;
      }

      // The fixes: the riskiest answers first, at most three.
      var risky = [];
      for (var i = 0; i < total; i++) { var p = P[i].pts[answers[i]] || 0; if (p > 0) risky.push({ i: i, p: p }); }
      risky.sort(function (a, b) { return b.p - a.p || a.i - b.i; });
      var ol = res.querySelector(".hack-fixes ol");
      if (!risky.length) ol.appendChild(h("li", { text: T.hack_fixes_none }));
      risky.slice(0, 3).forEach(function (f) {
        var li = h("li", null, h("span", { text: Q[f.i].fix }));
        var tool = P[f.i].tool && DATA.tools[P[f.i].tool];
        if (tool) li.appendChild(h("span", { class: "hack-tool" }, T.hack_try_tool + " ", h("a", { href: tool.url, text: tool.name })));
        ol.appendChild(li);
      });

      // Sharing: the link carries the score, so a friend who opens it is challenged to beat it.
      var link = DATA.url + "?s=" + score;
      var text = tr(T.hack_share_text, { score: score, title: r.title, emoji: r.emoji }).replace(/[⁨⁩]/g, "");
      var nets = {
        wa: "https://wa.me/?text=" + encodeURIComponent(text + " " + link),
        x: "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text) + "&url=" + encodeURIComponent(link),
        fb: "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(link),
        li: "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(link)
      };
      res.querySelectorAll("[data-net]").forEach(function (a) { a.href = nets[a.getAttribute("data-net")]; });

      var copyBtn = res.querySelector('[data-act="copy"]');
      copyBtn.addEventListener("click", function () {
        var label = copyBtn.querySelector("span"), old = T.hack_copy;
        var done = function () { label.textContent = T.hack_copied; setTimeout(function () { label.textContent = old; }, 2000); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text + " " + link).then(done, function () {});
      });

      var img = res.querySelector(".hack-card-img"), dl = res.querySelector('[data-act="download"]');
      img.alt = text;
      var cardBlob = null;
      drawCard(score, r, color).then(function (canvas) {
        if (!canvas) return;
        var url = canvas.toDataURL("image/png");
        img.src = url;
        dl.href = url;
        canvas.toBlob(function (b) { cardBlob = b; });
      });

      var shareBtn = res.querySelector('[data-act="share"]');
      if (navigator.share) {
        shareBtn.hidden = false;
        shareBtn.addEventListener("click", function () {
          var payload = { title: T.hack_title, text: text, url: link };
          if (cardBlob && window.File) {
            var file = new File([cardBlob], "how-hackable-am-i.png", { type: "image/png" });
            if (navigator.canShare && navigator.canShare({ files: [file] })) payload.files = [file];
          }
          navigator.share(payload).catch(function () {});
        });
      }

      res.querySelector('[data-act="retake"]').addEventListener("click", function () { answers = []; step = 0; showQuestion(true); });

      box.appendChild(node);
      var t = box.querySelector(".hack-title");
      t.focus({ preventScroll: true });
      if (box.getBoundingClientRect().top < 0) box.scrollIntoView({ block: "start" });
    }

    // ---------- The share card: a 1080x1080 picture of the result ----------
    function drawCard(score, r, color) {
      var lang = DATA.lang;
      var text = lang === "ur" ? '"Noto Nastaliq Urdu", sans-serif'
        : lang === "zh" ? '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC", system-ui, sans-serif'
        : '"Space Grotesk", system-ui, sans-serif';
      var body = lang === "ur" ? text : lang === "zh" ? text : '"Inter", system-ui, sans-serif';
      var loads = [];
      if (document.fonts && document.fonts.load) {
        ['700 120px "Space Grotesk"', '500 30px "JetBrains Mono"', '400 30px "Inter"'].forEach(function (f) { loads.push(document.fonts.load(f, "Aa0%")); });
        if (lang === "ur") loads.push(document.fonts.load('400 40px "Noto Nastaliq Urdu"', r.title + T.hack_title));
      }
      return Promise.all(loads).catch(function () {}).then(function () {
        var S = 1080, c = document.createElement("canvas");
        c.width = S; c.height = S;
        var x = c.getContext("2d");
        if (!x) return null;
        x.direction = rtl ? "rtl" : "ltr";

        var g = x.createLinearGradient(0, 0, S, S);
        g.addColorStop(0, "#061226"); g.addColorStop(1, "#0a2342");
        x.fillStyle = g; x.fillRect(0, 0, S, S);
        var glow = x.createRadialGradient(540, 470, 40, 540, 470, 560);
        glow.addColorStop(0, hexA(color, .22)); glow.addColorStop(1, "rgba(6,18,38,0)");
        x.fillStyle = glow; x.fillRect(0, 0, S, S);
        x.strokeStyle = "rgba(255,255,255,.045)"; x.lineWidth = 1;
        for (var v = 0; v <= S; v += 54) {
          x.beginPath(); x.moveTo(v + .5, 0); x.lineTo(v + .5, S); x.stroke();
          x.beginPath(); x.moveTo(0, v + .5); x.lineTo(S, v + .5); x.stroke();
        }
        x.strokeStyle = "rgba(34,211,238,.35)"; x.lineWidth = 3;
        roundRect(x, 30, 30, S - 60, S - 60, 36); x.stroke();

        x.textAlign = "center"; x.textBaseline = "alphabetic";
        // Title of the game
        x.fillStyle = "#22d3ee";
        var head = lang === "en" || lang === "de" ? T.hack_title.toUpperCase() : T.hack_title;
        fit(x, head, lang === "ur" ? "400 {s}px " + text : lang === "zh" ? "600 {s}px " + text : '500 {s}px "JetBrains Mono", monospace', 40, 900);
        x.fillText(head, 540, lang === "ur" ? 160 : 150);

        // The ring
        var cx = 540, cy = 470, rad = 200;
        x.lineCap = "round"; x.lineWidth = 34;
        x.strokeStyle = "rgba(255,255,255,.1)";
        x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.stroke();
        if (score > 0) {
          x.strokeStyle = color;
          x.beginPath(); x.arc(cx, cy, rad, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(score, 1) / 100); x.stroke();
        }
        x.direction = "ltr";
        x.fillStyle = "#ffffff";
        x.font = '700 130px "Space Grotesk", system-ui, sans-serif';
        x.fillText(score + "%", cx, cy + 30);
        x.direction = rtl ? "rtl" : "ltr";
        x.fillStyle = "#b8c6dc";
        x.font = (lang === "ur" ? "400 34px " : "500 36px ") + body;
        x.fillText(T.hack_label, cx, cy + (lang === "ur" ? 100 : 92));

        // You are... <title>
        x.fillStyle = "#9fb0c8";
        x.font = (lang === "ur" ? "400 32px " : "400 36px ") + body;
        x.fillText(T.hack_you_are, 540, lang === "ur" ? 765 : 770);
        x.fillStyle = "#ffffff";
        fit(x, r.title, (lang === "ur" ? "400" : "700") + " {s}px " + text, lang === "ur" ? 64 : 80, 940);
        x.fillText(r.title, 540, lang === "ur" ? 880 : 860);

        // Footer
        x.fillStyle = color;
        x.fillRect(440, 920, 200, 4);
        x.fillStyle = "#22d3ee";
        x.direction = "ltr";
        var foot = T.hack_card_url;
        x.font = '500 32px "JetBrains Mono", monospace';
        x.fillText(foot, 540, 990);
        return c;
      });
    }
    function fit(x, s, font, size, maxW) {
      for (; size > 18; size -= 2) { x.font = font.replace("{s}", size); if (x.measureText(s).width <= maxW) return; }
    }
    function roundRect(x, l, t, w, hh, rr) {
      x.beginPath(); x.moveTo(l + rr, t); x.arcTo(l + w, t, l + w, t + hh, rr); x.arcTo(l + w, t + hh, l, t + hh, rr);
      x.arcTo(l, t + hh, l, t, rr); x.arcTo(l, t, l + w, t, rr); x.closePath();
    }
    function hexA(hex, a) {
      var n = parseInt(hex.slice(1), 16);
      return "rgba(" + (n >> 16) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
    }
  })();
})();
