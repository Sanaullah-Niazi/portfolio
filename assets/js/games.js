// The games under /games/. Each game has its own page; this file runs whichever game is on the page.
// Everything runs in the browser and nothing is sent anywhere. The only things kept, in this browser's localStorage,
// are a game's best score and Daily Hack's results (for the streak). Text comes from the JSON block the page writes
// (_data/games.yml and its translations), and results are built with DOM nodes, never innerHTML.
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

  // Drawing helpers for the share cards.
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
  })();

  // ================= Daily Hack =================
  // One puzzle a day, built in the browser from the day's number with a seeded random generator, so everyone gets the
  // same puzzle on the same date without a server. The raw material is in _data/daily_hack.yml, the text in
  // _data/games.yml (daily_...). The puzzle is built the same way in every language: only the words around it change.
  (function daily() {
    var box = document.getElementById("daily"), dataEl = document.getElementById("daily-data");
    if (!box || !dataEl) return;
    var DATA;
    try { DATA = JSON.parse(dataEl.textContent); } catch (e) { return; }
    var T = DATA.text, K = DATA.pool, TRIES = K.tries || 3, KEY = "game-daily", lang = DATA.lang;
    var locale = root.getAttribute("lang") || "en";

    function tr(s, vars) {
      return String(s || "").replace(/\{(\w+)\}/g, function (m, k) {
        return vars && k in vars ? (rtl ? "⁨" + vars[k] + "⁩" : String(vars[k])) : m;
      });
    }
    function plain(s) { return s.replace(/[⁨⁩]/g, ""); }
    function num(n) { return new Intl.NumberFormat(locale).format(n); }

    // ---------- Which puzzle: #1 is the start date, counted in the player's own calendar days ----------
    function dayOf(y, m, d) { return Math.round(Date.UTC(y, m, d) / 864e5); }
    var sd = K.start.split("-").map(Number), startDay = dayOf(sd[0], sd[1] - 1, sd[2]);
    var now = new Date(), today = Math.max(1, dayOf(now.getFullYear(), now.getMonth(), now.getDate()) - startDay + 1);
    var params = new URLSearchParams(location.search);
    var asked = parseInt(params.get("n"), 10), n = today, archive = false;
    if (asked >= 1 && asked < today) { n = asked; archive = true; }
    // A friend's result arrives in the link they shared: ?n=12&t=2 (t = tries it took them, 0 = not cracked).
    var friend = null;
    if (asked >= 1 && asked <= today && /^[0-9]$/.test(params.get("t") || "") && +params.get("t") <= TRIES) friend = +params.get("t");
    if (asked !== n) friend = null;

    // ---------- Seeded randomness (the same numbers in every browser) ----------
    function seeded(seed) {
      var a = seed >>> 0;
      return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        var t = a;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
    function shuffle(r, arr) {
      arr = arr.slice();
      for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
      return arr;
    }
    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

    // ---------- The puzzle kinds ----------
    // Each returns { kind, q: [textKey, vars], opts: [{ t, ok, why: [textKey, vars] }], hints: [[textKey, vars], ...], ... }.

    // Spot the fake (or the real) link / email sender.
    function typo(r, name) {
      var ways = [];
      if (name.indexOf("o") > 0) ways.push(function (s) { return s.replace("o", "0"); });
      if (name.indexOf("l") > 0) ways.push(function (s) { return s.replace("l", "1"); });
      if (name.indexOf("m") >= 0) ways.push(function (s) { return s.replace("m", "rn"); });
      if (name.indexOf("w") >= 0) ways.push(function (s) { return s.replace("w", "vv"); });
      if (name.indexOf("i") > 0) ways.push(function (s) { return s.replace("i", "l"); });
      ways.push(function (s) { var i = 1 + Math.floor(r() * (s.length - 2)); return s.slice(0, i) + s[i] + s.slice(i); });
      if (name.length > 5) ways.push(function (s) { var i = 1 + Math.floor(r() * (s.length - 2)); return s.slice(0, i) + s.slice(i + 1); });
      ways.push(function (s) { var i = 1 + Math.floor(r() * (s.length - 3)); return s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2); });
      for (var k = 0; k < 8; k++) { var out = pick(r, ways)(name); if (out !== name) return out; }
      return name + name.slice(-1);
    }
    function makeLink(r, mail) {
      var br = pick(r, K.brands), d = br.d, name = d.split(".")[0], rest = d.slice(name.length);
      var findReal = r() < 0.5;
      var reals = [], seen = {};
      function addReal(s) { if (!seen[s]) { seen[s] = 1; reals.push(s); } }
      if (mail) {
        br.from.forEach(function (f) {
          [br.b].concat(shuffle(r, ["Support", "Account", "Security", "Team"]).slice(0, 2).map(function (w) { return br.b + " " + w; }))
            .forEach(function (dn) { addReal(dn + " <" + f + "@" + d + ">"); });
        });
      } else {
        [""].concat(br.subs).forEach(function (sub) {
          br.paths.forEach(function (p) { addReal("https://" + (sub ? sub + "." : "") + d + "/" + p); });
        });
      }
      reals = shuffle(r, reals);
      function fake(trick) {
        var evil = pick(r, K.evil), host, f = pick(r, br.from), path = pick(r, br.paths), t;
        if (trick === "sub") host = d + "." + evil;
        else if (trick === "typo") host = typo(r, name) + rest;
        else if (trick === "hyphen") { var w = pick(r, K.hyphen); host = (r() < 0.7 ? name + "-" + w : w + "-" + name) + ".com"; }
        else if (trick === "tld") { do { host = name + "." + pick(r, K.tlds); } while (host === d); }
        else if (trick === "free") host = pick(r, ["gmail.com", "outlook.com", "yahoo.com", "mail.ru"]);
        else host = evil;
        if (mail) t = br.b + (r() < 0.5 ? "" : " " + pick(r, ["Support", "Security", "Billing"])) + " <" + (trick === "free" ? name + "." + pick(r, ["support", "help", "team"]) : f) + "@" + host + ">";
        else if (trick === "at") t = "https://" + d + "@" + host + "/" + path;
        else if (trick === "path") t = "https://" + host + "/" + d + "/" + path;
        else t = "https://" + host + "/" + path;
        return { t: t, fake: true, why: ["daily_why_" + trick, { host: host, domain: d, brand: br.b }] };
      }
      var tricks = shuffle(r, mail ? ["sub", "typo", "hyphen", "tld", "free"] : ["sub", "typo", "hyphen", "tld", "at", "path"]);
      var opts = [];
      if (findReal) {
        opts.push({ t: reals[0], ok: true, why: ["daily_why_real", { domain: d, brand: br.b }] });
        tricks.slice(0, 3).forEach(function (tk) { opts.push(fake(tk)); });
      } else {
        reals.slice(0, 3).forEach(function (s) { opts.push({ t: s, why: ["daily_why_real", { domain: d, brand: br.b }] }); });
        var f = fake(tricks[0]); f.ok = true; opts.push(f);
      }
      return {
        kind: mail ? "mail" : "link", mono: true,
        q: ["daily_q_" + (mail ? "mail" : "link") + (findReal ? "_real" : "_fake"), { brand: br.b }],
        opts: shuffle(r, opts),
        hints: [[mail ? "daily_h_mail" : "daily_h_link", { brand: br.b }], ["daily_h_look", {}]]
      };
    }

    // Crack the password: a made-up profile, a few leaked facts about the password, four guesses.
    var CLUES = {
      len: function (s, p, v) { return s.length === v; },
      upper: function (s) { return /^[A-Z]/.test(s); },
      lower: function (s) { return /^[a-z]/.test(s); },
      end_sym: function (s) { return /[^A-Za-z0-9]$/.test(s); },
      end_digit: function (s) { return /[0-9]$/.test(s); },
      has_sym: function (s) { return /[^A-Za-z0-9]/.test(s); },
      no_sym: function (s) { return !/[^A-Za-z0-9]/.test(s); },
      has_pet: function (s, p) { return s.toLowerCase().indexOf(p.pet.toLowerCase()) >= 0; },
      has_name: function (s, p) { return s.toLowerCase().indexOf(p.name.toLowerCase()) >= 0; },
      has_city: function (s, p) { return s.toLowerCase().indexOf(p.city.toLowerCase()) >= 0; },
      has_year: function (s, p) { return s.indexOf(String(p.year)) >= 0; },
      has_num: function (s, p) { return s.indexOf(String(p.num)) >= 0; }
    };
    var PATTERNS = [["Pet", "year"], ["Pet", "year", "sym"], ["pet", "year"], ["Name", "num"], ["name", "num", "sym"], ["Name", "yy"],
      ["City", "year"], ["city", "num"], ["Pet", "num", "sym"], ["Name", "year", "sym"], ["pet", "yy"], ["Name", "Pet"], ["City", "sym", "num"],
      ["pet", "num"], ["Name", "year"], ["sym", "Pet", "yy"]];
    function makeCrack(r) {
      for (var attempt = 0; attempt < 40; attempt++) {
        var p = { name: pick(r, K.names), pet: pick(r, K.pets), city: pick(r, K.cities), year: 1984 + Math.floor(r() * 24), sym: pick(r, K.symbols) };
        do { p.num = pick(r, [7, 9, 10, 11, 13, 14, 21, 22, 23, 27, 33, 77, 99, 313, 786]); }
        while (String(p.year).indexOf(String(p.num)) >= 0 || String(p.num).indexOf(String(p.year % 100)) >= 0);
        var val = { pet: p.pet.toLowerCase(), Pet: p.pet, name: p.name.toLowerCase(), Name: p.name, city: p.city.toLowerCase(), City: p.city,
          year: String(p.year), yy: String(p.year % 100).padStart(2, "0"), num: String(p.num), sym: p.sym };
        var cands = [], seen = {};
        shuffle(r, PATTERNS).forEach(function (pat) {
          var s = pat.map(function (x) { return val[x]; }).join("");
          if (!seen[s] && cands.length < 4) { seen[s] = 1; cands.push({ s: s, pat: pat }); }
        });
        var ans = cands[0].s;
        // Every clue that is true of the answer, then the fewest of them that rule out all the other guesses.
        var all = [];
        Object.keys(CLUES).forEach(function (k) {
          var v = k === "len" ? ans.length : null;
          if (CLUES[k](ans, p, v)) all.push({ k: k, v: v });
        });
        all = shuffle(r, all);
        var left = cands.slice(1), chosen = [];
        while (left.length) {
          var best = null, bestCut = 0;
          all.forEach(function (c) {
            if (chosen.indexOf(c) >= 0) return;
            var cut = left.filter(function (o) { return !CLUES[c.k](o.s, p, c.v); }).length;
            if (cut > bestCut) { best = c; bestCut = cut; }
          });
          if (!best) break;
          chosen.push(best);
          left = left.filter(function (o) { return CLUES[best.k](o.s, p, best.v); });
        }
        if (left.length || chosen.length > 4) continue;
        if (chosen.length < 2) { var extra = all.filter(function (c) { return chosen.indexOf(c) < 0; })[0]; if (extra) chosen.push(extra); }
        chosen = shuffle(r, chosen);
        var opts = cands.map(function (c, i) {
          var broken = chosen.filter(function (cl) { return !CLUES[cl.k](c.s, p, cl.v); })[0];
          return { t: c.s, ok: i === 0, why: i === 0 ? ["daily_why_match", {}] : ["daily_why_breaks", { clue: clueText(broken) }] };
        });
        return {
          kind: "crack", mono: true, profile: p, clues: chosen,
          q: ["daily_q_crack", { name: p.name }],
          opts: shuffle(r, opts),
          hints: [["daily_h_crack", {}], ["daily_h_recipe", { recipe: cands[0].pat.map(function (x) { return x === "sym" ? p.sym : T.daily_parts[x]; }).join(" + ") }]]
        };
      }
      return makeStrong(r);
    }
    function clueText(c) { return c ? tr(T.daily_clues[c.k], { n: c.v }) : ""; }

    // Decode the message: a word scrambled with a classic trick.
    var NATO = "Alfa Bravo Charlie Delta Echo Foxtrot Golf Hotel India Juliett Kilo Lima Mike November Oscar Papa Quebec Romeo Sierra Tango Uniform Victor Whiskey X-ray Yankee Zulu".split(" ");
    var LEET = { A: "4", E: "3", I: "1", O: "0", S: "5", T: "7", B: "8", G: "6" };
    function makeDecode(r) {
      var word = pick(r, K.words), method = pick(r, K.decode), k = 1 + Math.floor(r() * 5), code;
      var same = shuffle(r, K.words.filter(function (w) { return w.length === word.length && w !== word; }));
      // Wrong answers: same length, and the same first letter when possible, so the first letter alone doesn't give it away.
      same.sort(function (a, b) { return (b[0] === word[0]) - (a[0] === word[0]); });
      var letters = word.split("");
      if (method === "leet" && letters.filter(function (c) { return LEET[c]; }).length < 2) method = "reverse";
      if (method === "reverse") code = letters.reverse().join("");
      else if (method === "caesar") code = letters.map(function (c) { return String.fromCharCode((c.charCodeAt(0) - 65 + k) % 26 + 65); }).join("");
      else if (method === "a1z26") code = letters.map(function (c) { return c.charCodeAt(0) - 64; }).join("-");
      else if (method === "nato") code = letters.map(function (c) { return NATO[c.charCodeAt(0) - 65]; }).join(" ");
      else if (method === "hex") code = letters.map(function (c) { return c.charCodeAt(0).toString(16).toUpperCase(); }).join(" ");
      else if (method === "atbash") code = letters.map(function (c) { return String.fromCharCode(155 - c.charCodeAt(0)); }).join("");
      else code = letters.map(function (c) { return LEET[c] || c; }).join("");
      var vars = { k: k, first: word[0], start: word.slice(0, 2), a: String.fromCharCode(65 + k) };
      var opts = [{ t: word, ok: true, why: ["daily_why_decoded", { method: tr(T.daily_mname[method], vars), code: code, word: word }] }];
      same.slice(0, 3).forEach(function (w) { opts.push({ t: w, why: null }); });
      return {
        kind: "decode", code: code, method: method, mvars: vars,
        q: ["daily_q_decode", {}],
        opts: shuffle(r, opts),
        hints: [["daily_h_" + method, vars], ["daily_h_start", vars]]
      };
    }

    // Pick the strongest password. The longest isn't always the answer: long but predictable ones are on hackers' lists.
    var CHARS = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!#$%&*?@";
    function randomPw(r, len) { var s = ""; for (var i = 0; i < len; i++) s += CHARS[Math.floor(r() * CHARS.length)]; return s; }
    function makeStrong(r) {
      var ans, akind;
      if (r() < 0.65) {
        var words = shuffle(r, K.phrase_words).slice(0, 4);
        if (r() < 0.4) words[Math.floor(r() * 4)] = cap(words[Math.floor(r() * 4)]);
        ans = words.join(pick(r, ["-", ".", "_", " ", "-"]));
        akind = "phrase";
      } else { ans = randomPw(r, 14 + Math.floor(r() * 4)); akind = "random"; }
      var trapLen = r() < 0.6 ? ans.length + 2 + Math.floor(r() * 5) : 12 + Math.floor(r() * 4);
      function weak(kind) {
        var w;
        if (kind === "leet") {
          w = cap(pick(r, K.common)).replace(/a/g, "@").replace(/o/g, "0").replace(/e/g, "3").replace(/i/g, "1").replace(/s/g, "$");
          w += r() < 0.5 ? String(2015 + Math.floor(r() * 12)) + "!" : "!";
        } else if (kind === "nameyear") w = pick(r, K.names) + (1985 + Math.floor(r() * 25)) + (r() < 0.5 ? "!" : "");
        else if (kind === "walk") w = pick(r, K.walks);
        else if (kind === "repeat") { var unit = pick(r, ["a", "1", "ab", "abc", "123", "x", "pk"]); w = ""; while (w.length < trapLen) w += unit; w = w.slice(0, trapLen); }
        else if (kind === "seq") w = (r() < 0.5 ? "abcdefghijklmnopqrstuvwxyz" : "1234567890123456789012345").slice(0, trapLen);
        else if (kind === "common") { var c = pick(r, K.common); w = c; while (w.length < trapLen - 3) w += c; w += "123"; }
        else w = randomPw(r, 6);
        return { t: w, why: ["daily_why_" + kind, { n: w.length }] };
      }
      var longOnes = shuffle(r, ["repeat", "seq", "common"]), shortOnes = shuffle(r, ["leet", "nameyear", "walk", "short"]);
      var kinds = [longOnes[0]].concat(shortOnes.slice(0, 2));
      var opts = [{ t: ans, ok: true, why: ["daily_why_" + akind, { n: ans.length }] }];
      kinds.forEach(function (kd) { opts.push(weak(kd)); });
      return { kind: "strong", mono: true, q: ["daily_q_strong", {}], opts: shuffle(r, opts), hints: [["daily_h_strong", {}], ["daily_h_strong2", {}]] };
    }

    function puzzleFor(day) {
      var r = seeded(day * 2654435761 ^ 0x5eed1e);
      var kind = K.schedule[(day - 1) % K.schedule.length];
      if (kind === "link" || kind === "mail") return makeLink(r, kind === "mail");
      if (kind === "crack") return makeCrack(r);
      if (kind === "decode") return makeDecode(r);
      return makeStrong(r);
    }
    var PZ = puzzleFor(n), ANS = 0;
    PZ.opts.forEach(function (o, i) { if (o.ok) ANS = i; });

    // ---------- What this browser remembers: picks per puzzle, and whether it was played on its own day ----------
    function load() {
      var st;
      try { st = JSON.parse(store(KEY) || "{}"); } catch (e) { st = {}; }
      if (!st || typeof st !== "object" || typeof st.d !== "object" || !st.d) st = { d: {} };
      return st;
    }
    var state = load();
    function save() {
      var keys = Object.keys(state.d).map(Number).sort(function (a, b) { return a - b; });
      while (keys.length > 400) delete state.d[keys.shift()];
      store(KEY, JSON.stringify(state));
    }
    var entry = state.d[n];
    if (!entry || !Array.isArray(entry.p) || entry.p.some(function (i) { return !(i >= 0 && i < PZ.opts.length); })) entry = { p: [], live: !archive };
    function solved() { return entry.p.indexOf(ANS) >= 0; }
    function finished() { return solved() || entry.p.length >= TRIES; }

    function stats() {
      var s = { played: 0, won: 0, dist: [0, 0, 0, 0], streak: 0, best: 0 }, run = 0, prev = null;
      Object.keys(state.d).map(Number).sort(function (a, b) { return a - b; }).forEach(function (d) {
        var e = state.d[d];
        if (!e || !e.live || !(e.r >= 0)) return;
        s.played++;
        if (e.r > 0) { s.won++; s.dist[e.r - 1]++; run = prev === d - 1 ? run + 1 : 1; } else { s.dist[TRIES]++; run = 0; }
        prev = e.r > 0 ? d : null;
        if (run > s.best) s.best = run;
      });
      for (var d = today; d >= 1; d--) {
        var e = state.d[d];
        if (d === today && !(e && e.r >= 0)) continue;
        if (e && e.live && e.r > 0) s.streak++; else break;
      }
      return s;
    }

    // ---------- Drawing the puzzle ----------
    var timer = null;
    function clear() { while (box.firstChild) box.removeChild(box.firstChild); if (timer) { clearInterval(timer); timer = null; } }
    function text(key) { return tr(T[key[0]], key[1]); }

    function render(focusSel) {
      clear();
      var done = finished(), wrong = entry.p.filter(function (i) { return i !== ANS; }).length;

      var dots = h("span", { class: "dh-dots", role: "img", "aria-label": tr(T.daily_tries_left, { n: num(TRIES - entry.p.length) }) });
      for (var i = 0; i < TRIES; i++) {
        var pk = entry.p[i];
        dots.appendChild(h("span", { class: "dh-dot" + (pk === undefined ? "" : pk === ANS ? " is-right" : " is-wrong") }));
      }
      box.appendChild(h("div", { class: "dh-head" },
        h("span", { class: "dh-num", text: tr(T.daily_num, { n: "#" + num(n) }) }),
        h("span", { class: "level-chip", text: T.daily_kinds[PZ.kind] }), dots));

      if (archive) {
        var dt = new Date(sd[0], sd[1] - 1, sd[2] + n - 1);
        var note = h("p", { class: "dh-note" }, tr(T.daily_archive, { n: "#" + num(n), date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(dt) }) + " ");
        note.appendChild(h("a", { href: DATA.url, text: T.daily_play_today }));
        box.appendChild(note);
      }
      if (friend !== null && !done) {
        box.appendChild(h("p", { class: "hack-friend" }, h("span", { text: friend > 0 ? tr(T.daily_friend_won, { n: "#" + num(n), t: num(friend), max: num(TRIES) }) : tr(T.daily_friend_lost, { n: "#" + num(n) }) })));
      }

      box.appendChild(h("h2", { class: "dh-q", id: "dh-q", tabindex: "-1" }, text(PZ.q)));

      if (PZ.kind === "crack") {
        var p = PZ.profile, dl = h("dl", { class: "dh-profile" });
        [["name", p.name], ["pet", p.pet], ["born", String(p.year)], ["city", p.city], ["num", String(p.num)]].forEach(function (row) {
          dl.appendChild(h("div", null, h("dt", { text: T.daily_profile[row[0]] }), h("dd", { text: row[1], dir: "ltr" })));
        });
        var ul = h("ul", { class: "dh-clues" });
        PZ.clues.forEach(function (c) { ul.appendChild(h("li", { text: clueText(c) })); });
        box.appendChild(h("div", { class: "dh-case" }, dl, h("div", null, h("p", { class: "label", text: T.daily_clues_title }), ul)));
      } else if (PZ.kind === "decode") {
        box.appendChild(h("div", { class: "dh-code" },
          h("p", { class: "muted", text: tr(T.daily_m[PZ.method], PZ.mvars) }),
          h("code", { dir: "ltr", text: PZ.code })));
      }

      var list = h("div", { class: "hack-opts dh-opts" + (PZ.mono ? " is-mono" : ""), role: "group", "aria-labelledby": "dh-q" });
      PZ.opts.forEach(function (o, idx) {
        var picked = entry.p.indexOf(idx) >= 0, cls = "hack-opt";
        if (picked) cls += idx === ANS ? " is-right" : " is-wrong";
        else if (done && idx === ANS) cls += " is-answer";
        var b = h("button", { class: cls, type: "button", "aria-pressed": picked ? "true" : "false" },
          h("span", { class: "hack-key", "aria-hidden": "true", text: picked ? (idx === ANS ? "✓" : "✗") : String.fromCharCode(65 + idx) }),
          h("span", { class: "dh-opt-text", dir: "ltr", text: o.t }));
        if (done || picked) b.disabled = true;
        else b.addEventListener("click", function () { choose(idx); });
        list.appendChild(b);
        if (done && o.why) {
          var why = h("p", { class: "dh-why" + (idx === ANS ? " is-answer" : ""), text: text(o.why) });
          list.appendChild(why);
        }
      });
      box.appendChild(list);

      var status = h("p", { class: "dh-status", id: "dh-status", tabindex: "-1", "aria-live": "polite" });
      if (!done && wrong) status.textContent = T.daily_wrong + " " + tr(T.daily_tries_left, { n: num(TRIES - entry.p.length) });
      box.appendChild(status);
      if (!done) {
        for (var w = 0; w < wrong && w < PZ.hints.length; w++) {
          box.appendChild(h("p", { class: "dh-hint" }, h("strong", { text: T.daily_hint + " " + (w + 1) + ": " }), h("span", { text: text(PZ.hints[w]) })));
        }
      }

      if (done) box.appendChild(result());
      var f = focusSel && box.querySelector(focusSel);
      if (f) f.focus({ preventScroll: true });
      if (focusSel && box.getBoundingClientRect().top < 0) box.scrollIntoView({ block: "start" });
    }

    var busy = false;
    function choose(idx) {
      if (busy || finished() || entry.p.indexOf(idx) >= 0) return;
      busy = true;
      entry.p.push(idx);
      if (finished()) entry.r = solved() ? entry.p.length : 0;
      state.d[n] = entry;
      save();
      setTimeout(function () { busy = false; render(finished() ? ".dh-result-title" : "#dh-status"); }, 120);
    }

    // ---------- The result: what it was, the lesson, sharing, stats, the countdown ----------
    function grid() {
      var g = entry.p.map(function (i) { return i === ANS ? "🟩" : "🟥"; }).join("");
      return g;
    }
    function result() {
      var s = stats(), won = solved(), tries = won ? entry.p.length : 0;
      var node = document.getElementById("daily-result-tpl").content.cloneNode(true);
      var res = node.querySelector(".dh-result");
      res.querySelector(".dh-result-title").textContent = won ? T.daily_won[Math.min(tries, T.daily_won.length) - 1] : T.daily_lost;
      res.querySelector(".dh-grid").textContent = grid();
      if (friend !== null) {
        var vs = res.querySelector(".hack-vs");
        var me = won ? tries : TRIES + 1, them = friend > 0 ? friend : TRIES + 1;
        vs.textContent = tr(me < them ? T.daily_vs_win : me > them ? T.daily_vs_lose : T.daily_vs_tie, {});
        vs.hidden = false;
      }
      res.querySelector(".dh-lesson-text").textContent = T.daily_lessons[PZ.kind];
      var tool = DATA.tools[K.tools[PZ.kind]];
      if (tool) {
        var tl = res.querySelector(".dh-tool");
        tl.appendChild(document.createTextNode(T.hack_try_tool + " "));
        tl.appendChild(h("a", { href: tool.url, text: tool.name }));
        tl.hidden = false;
      }

      // Sharing: the link carries the puzzle and how it went, so a friend gets the same puzzle and a score to beat.
      var link = DATA.url + "?n=" + n + "&t=" + tries;
      var line = plain(won ? tr(T.daily_share_won, { n: "#" + n, t: tries, max: TRIES }) : tr(T.daily_share_lost, { n: "#" + n, max: TRIES }));
      var share = line + "\n" + grid() + (!archive && s.streak > 1 ? "\n" + plain(tr(T.daily_share_streak, { s: s.streak })) : "") + "\n" + T.daily_share_cta;
      var nets = {
        wa: "https://wa.me/?text=" + encodeURIComponent(share + " " + link),
        x: "https://twitter.com/intent/tweet?text=" + encodeURIComponent(share) + "&url=" + encodeURIComponent(link),
        fb: "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(link),
        li: "https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(link)
      };
      res.querySelectorAll("[data-net]").forEach(function (a) { a.href = nets[a.getAttribute("data-net")]; });
      var copyBtn = res.querySelector('[data-act="copy"]');
      copyBtn.addEventListener("click", function () {
        var label = copyBtn.querySelector("span"), old = label.textContent;
        var ok = function () { label.textContent = T.hack_copied; setTimeout(function () { label.textContent = old; }, 2000); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(share + "\n" + link).then(ok, function () {});
      });
      var img = res.querySelector(".hack-card-img"), dl = res.querySelector('[data-act="download"]'), cardBlob = null;
      img.alt = share;
      dl.setAttribute("download", "daily-hack-" + n + ".png");
      drawCard(tries, s).then(function (canvas) {
        if (!canvas) return;
        var url = canvas.toDataURL("image/png");
        img.src = url; dl.href = url;
        canvas.toBlob(function (b) { cardBlob = b; });
      });
      var shareBtn = res.querySelector('[data-act="share"]');
      if (navigator.share) {
        shareBtn.hidden = false;
        shareBtn.addEventListener("click", function () {
          var payload = { title: T.daily_title, text: share, url: link };
          if (cardBlob && window.File) {
            var file = new File([cardBlob], "daily-hack-" + n + ".png", { type: "image/png" });
            if (navigator.canShare && navigator.canShare({ files: [file] })) payload.files = [file];
          }
          navigator.share(payload).catch(function () {});
        });
      }

      // Stats (only puzzles played on their own day count).
      var put = function (sel, v) { res.querySelector(sel).textContent = v; };
      put('[data-stat="played"]', num(s.played));
      put('[data-stat="win"]', num(s.played ? Math.round(s.won / s.played * 100) : 0) + "%");
      put('[data-stat="streak"]', num(s.streak));
      put('[data-stat="best"]', num(s.best));
      var bars = res.querySelector(".dh-bars"), top = Math.max(1, Math.max.apply(null, s.dist));
      s.dist.forEach(function (c, i) {
        var fill = h("span", { class: "dh-bar-fill", text: num(c) });
        fill.style.width = Math.max(8, c / top * 100) + "%";
        var mine = !archive && (i === (tries ? tries - 1 : TRIES));
        bars.appendChild(h("div", { class: "dh-bar" + (mine ? " is-mine" : "") }, h("span", { class: "dh-bar-key", text: i < TRIES ? num(i + 1) : "✗" }), h("span", { class: "dh-bar-track" }, fill)));
      });

      // Next puzzle countdown, and the previous puzzles.
      var cd = res.querySelector(".dh-countdown");
      function tick() {
        var t = new Date(), next = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1), left = Math.max(0, Math.floor((next - t) / 1000));
        if (dayOf(t.getFullYear(), t.getMonth(), t.getDate()) - startDay + 1 > today) {
          cd.textContent = "";
          cd.appendChild(h("a", { href: DATA.url, text: T.daily_ready }));
          clearInterval(timer); timer = null;
          return;
        }
        var hh = Math.floor(left / 3600), mm = Math.floor(left % 3600 / 60), ss = left % 60;
        cd.textContent = [hh, mm, ss].map(function (v) { return String(v).padStart(2, "0"); }).join(":");
      }
      tick();
      timer = setInterval(tick, 1000);
      var nav = res.querySelector(".dh-more");
      if (archive) nav.appendChild(h("a", { class: "btn btn-sm btn-primary", href: DATA.url, text: T.daily_play_today }));
      if (n > 1) nav.appendChild(h("a", { class: "btn btn-sm", href: DATA.url + "?n=" + (n - 1), text: tr(T.daily_prev, { n: "#" + num(n - 1) }) }));
      return node;
    }

    // ---------- The share card: a 1080x1080 picture with the number, the squares and the streak ----------
    function drawCard(tries, s) {
      var text = lang === "ur" ? '"Noto Nastaliq Urdu", sans-serif'
        : lang === "zh" ? '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC", system-ui, sans-serif'
        : '"Space Grotesk", system-ui, sans-serif';
      var loads = [];
      if (document.fonts && document.fonts.load) {
        ['700 120px "Space Grotesk"', '500 30px "JetBrains Mono"'].forEach(function (f) { loads.push(document.fonts.load(f, "Aa0#")); });
        if (lang === "ur") loads.push(document.fonts.load('400 40px "Noto Nastaliq Urdu"', T.daily_kinds[PZ.kind] + T.daily_lost + T.daily_card_won));
      }
      return Promise.all(loads).catch(function () {}).then(function () {
        var S = 1080, c = document.createElement("canvas");
        c.width = S; c.height = S;
        var x = c.getContext("2d");
        if (!x) return null;
        var color = tries ? "#34d399" : "#f87171";
        var g = x.createLinearGradient(0, 0, S, S);
        g.addColorStop(0, "#061226"); g.addColorStop(1, "#0a2342");
        x.fillStyle = g; x.fillRect(0, 0, S, S);
        var glow = x.createRadialGradient(540, 560, 40, 540, 560, 560);
        glow.addColorStop(0, hexA(color, .18)); glow.addColorStop(1, "rgba(6,18,38,0)");
        x.fillStyle = glow; x.fillRect(0, 0, S, S);
        x.strokeStyle = "rgba(255,255,255,.045)"; x.lineWidth = 1;
        for (var v = 0; v <= S; v += 54) {
          x.beginPath(); x.moveTo(v + .5, 0); x.lineTo(v + .5, S); x.stroke();
          x.beginPath(); x.moveTo(0, v + .5); x.lineTo(S, v + .5); x.stroke();
        }
        x.strokeStyle = "rgba(34,211,238,.35)"; x.lineWidth = 3;
        roundRect(x, 30, 30, S - 60, S - 60, 36); x.stroke();
        x.textAlign = "center"; x.textBaseline = "alphabetic";

        x.direction = "ltr";
        x.fillStyle = "#22d3ee";
        x.font = '500 40px "JetBrains Mono", monospace';
        x.fillText("DAILY HACK", 540, 150);
        x.fillStyle = "#ffffff";
        x.font = '700 150px "Space Grotesk", system-ui, sans-serif';
        x.fillText("#" + n, 540, 310);
        x.direction = rtl ? "rtl" : "ltr";
        x.fillStyle = "#b8c6dc";
        fit(x, T.daily_kinds[PZ.kind], (lang === "ur" ? "400" : "500") + " {s}px " + text, 40, 900);
        x.fillText(T.daily_kinds[PZ.kind], 540, lang === "ur" ? 400 : 385);

        // The squares: one per try.
        var size = 150, gap = 30, left = 540 - (TRIES * size + (TRIES - 1) * gap) / 2;
        for (var i = 0; i < TRIES; i++) {
          var pk = entry.p[i];
          x.fillStyle = pk === undefined ? "rgba(255,255,255,.08)" : pk === ANS ? "#34d399" : "#f87171";
          roundRect(x, left + i * (size + gap), 460, size, size, 22); x.fill();
        }
        x.fillStyle = "#ffffff";
        var line = tries ? tr(T.daily_card_won, { t: tries, max: TRIES }) : T.daily_lost_short;
        fit(x, plain(line), (lang === "ur" ? "400" : "700") + " {s}px " + text, lang === "ur" ? 56 : 66, 940);
        x.fillText(plain(line), 540, lang === "ur" ? 760 : 750);
        if (!archive && s.streak > 1) {
          x.fillStyle = "#facc15";
          var st = plain(tr(T.daily_share_streak, { s: s.streak }));
          fit(x, st, (lang === "ur" ? "400" : "600") + " {s}px " + text, 40, 900);
          x.fillText(st, 540, lang === "ur" ? 850 : 830);
        }
        x.fillStyle = color;
        x.fillRect(440, 920, 200, 4);
        x.fillStyle = "#22d3ee";
        x.direction = "ltr";
        x.font = '500 32px "JetBrains Mono", monospace';
        x.fillText(T.daily_card_url, 540, 990);
        return c;
      });
    }

    render(null);
  })();
})();
