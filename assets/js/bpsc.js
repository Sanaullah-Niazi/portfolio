// BPSC interview prep section (/bpsc-interview/): interview countdown, copy link, expand all, print, and the search
// over every bank (FR-15 to FR-20). Plain JavaScript, no libraries, nothing loaded from other sites.
// The search index (/bpsc-interview/index.json) is downloaded only once the visitor starts searching.
(function () {
  "use strict";
  var DAY = 86400000;

  function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function parseDay(s) { var p = String(s).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }

  // Countdown to the interview window (FR-1).
  var win = document.querySelector(".bp-window");
  if (win) {
    var from = parseDay(win.dataset.from), to = parseDay(win.dataset.to), now = today();
    var left = Math.round((from - now) / DAY), out = win.querySelector(".bp-countdown");
    if (left > 1) out.textContent = win.dataset.left.replace("[n]", left);
    else if (left === 1) out.textContent = win.dataset.leftOne;
    else if (now <= to) out.textContent = win.dataset.on;
    else out.textContent = win.dataset.over;
  }

  // "New" badges: the page may be older than a day (offline copy), so check the date again here.
  var newDays = 7, searchBox = document.querySelector(".bp-search");
  if (searchBox && searchBox.dataset.newDays) newDays = +searchBox.dataset.newDays;
  var newAfter = today().getTime() - newDays * DAY;
  document.querySelectorAll(".bp-new[data-added]").forEach(function (b) {
    if (parseDay(b.dataset.added).getTime() < newAfter) b.remove();
  });

  // Copy link (FR-12).
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (ok, fail) {
      var t = document.createElement("textarea");
      t.value = text; t.setAttribute("readonly", ""); t.className = "sr-only";
      document.body.appendChild(t); t.select();
      try { document.execCommand("copy") ? ok() : fail(); } catch (e) { fail(e); }
      t.remove();
    });
  }
  document.querySelectorAll(".bp-copy").forEach(function (btn) {
    var label = btn.querySelector("span"), orig = label.textContent;
    btn.addEventListener("click", function () {
      copyText(btn.dataset.url).then(function () {
        label.textContent = btn.dataset.done;
        setTimeout(function () { label.textContent = orig; }, 2000);
      }, function () { label.textContent = btn.dataset.url; });
    });
  });

  // Expand all / close all, and print with every answer open (FR-8, FR-14).
  var qs = document.querySelectorAll("details.bp-q");
  var expand = document.querySelector(".bp-expand");
  function setAll(open) {
    qs.forEach(function (d) { d.open = open; });
    if (expand) { expand.setAttribute("aria-pressed", String(open)); expand.textContent = open ? expand.dataset.close : expand.dataset.open; }
  }
  if (expand) expand.addEventListener("click", function () { setAll(expand.getAttribute("aria-pressed") !== "true"); });
  var printBtn = document.querySelector(".bp-print");
  if (printBtn) printBtn.addEventListener("click", function () { setAll(true); window.print(); });
  window.addEventListener("beforeprint", function () { qs.forEach(function (d) { d.open = true; }); });

  // A link to /bpsc-interview/<bank>/#<id> opens that question.
  function openHash() {
    var id = decodeURIComponent(location.hash.slice(1)), d = id && document.getElementById(id);
    if (d && d.tagName === "DETAILS") d.open = true;
  }
  openHash();
  window.addEventListener("hashchange", openHash);

  if (!searchBox) return;

  // ---- Search ----
  var box = searchBox, form = box.querySelector("form"), input = form.elements.q;
  var fBank = form.elements.bank, fCat = form.elements.cat, fFreq = form.elements.f, fZone = form.elements.zone, fNew = form.elements["new"];
  var status = box.querySelector(".bp-res-status"), list = box.querySelector(".bp-results"), more = box.querySelector(".bp-more");
  var urdu = box.dataset.lang === "ur", qPrefix = box.dataset.q;
  var bankNames = {};
  Array.prototype.forEach.call(fBank.options, function (o) { if (o.value) bankNames[o.value] = o.textContent; });

  // Spelling variants (FR-17): every word of a group counts as its first word.
  var canon = {}, groups = {};
  try { JSON.parse(box.dataset.synonyms || "[]").forEach(function (g) {
    var head = flat(String(g[0]));
    groups[head] = [];
    g.forEach(function (w) { var k = flat(String(w)); canon[k] = head; groups[head].push(String(w)); });
  }); } catch (e) { /* no synonyms */ }

  function flat(w) { return w.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’`\-]/g, ""); }
  var WORD = /[\p{L}\p{N}]+(?:['’`\-][\p{L}\p{N}]+)*/gu;
  // Words of a text. For the index, a hyphenated word also gives its parts ("russia-ukraine" finds "ukraine").
  function words(text, forIndex) {
    var out = [], m, s = String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
    WORD.lastIndex = 0;
    while ((m = WORD.exec(s))) {
      var w = flat(m[0]);
      out.push(canon[w] || w);
      if (forIndex && /['’`\-]/.test(m[0])) m[0].split(/['’`\-]/).forEach(function (p) { p = flat(p); if (p) out.push(canon[p] || p); });
    }
    return out;
  }

  var items = null, news = [], loading = null, shown = 30, results = [];
  var newsBox = box.querySelector(".bp-news-res");
  function load() {
    if (loading) return loading;
    status.textContent = box.dataset.loading;
    loading = fetch(box.dataset.index, { credentials: "omit" }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).then(function (data) {
      items = data.items.map(function (it) {
        it.qw = " " + words(it.q + " " + (it.qu || ""), true).join(" ") + " ";
        it.hay = it.qw + words([it.s, it.a, it.c, (it.t || []).join(" ")].join(" "), true).join(" ") + " ";
        return it;
      });
      news = (data.news || []).map(function (n) { n.hay = " " + words(n.t, true).join(" ") + " "; return n; });
    }).catch(function () { loading = null; status.textContent = box.dataset.error; });
    return loading;
  }

  function active() {
    return input.value.trim() !== "" || fBank.value || fCat.value || fFreq.value || (fZone && fZone.value) || fNew.checked;
  }

  function syncCats() {
    Array.prototype.forEach.call(fCat.querySelectorAll("optgroup"), function (g) {
      var hide = fBank.value && g.dataset.bank !== fBank.value;
      g.hidden = hide; g.disabled = hide;
    });
    var sel = fCat.selectedOptions[0];
    if (sel && sel.parentNode.disabled) fCat.value = "";
  }

  function syncUrl() {
    var p = new URLSearchParams();
    if (input.value.trim()) p.set("q", input.value.trim());
    if (fBank.value) p.set("bank", fBank.value);
    if (fCat.value) p.set("cat", fCat.value);
    if (fFreq.value) p.set("f", fFreq.value);
    if (fZone && fZone.value) p.set("zone", fZone.value);
    if (fNew.checked) p.set("new", "1");
    var qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  }

  function run() {
    syncCats();
    syncUrl();
    if (!active()) { list.hidden = true; more.hidden = true; newsBox.hidden = true; status.textContent = ""; list.textContent = ""; return; }
    if (!items) { load().then(function () { if (items) run(); }); return; }
    var terms = words(input.value, false);
    var minF = +fFreq.value || 0, cutoff = new Date(today().getTime() - newDays * DAY);
    var bank = fBank.value, cat = fCat.value, zone = fZone ? fZone.value : "", onlyNew = fNew.checked;
    results = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (bank && it.b !== bank) continue;
      if (cat && it.c !== cat) continue;
      if (minF && it.f < minF) continue;
      if (zone && (it.z || []).indexOf(zone) < 0) continue;
      if (onlyNew && parseDay(it.d) < cutoff) continue;
      var score = it.f, ok = true;
      for (var j = 0; j < terms.length; j++) {
        var t = " " + terms[j];
        if (it.hay.indexOf(t) < 0) { ok = false; break; }
        if (it.qw.indexOf(t) >= 0) score += 10;
      }
      if (ok) results.push({ it: it, score: score });
    }
    results.sort(function (a, b) { return b.score - a.score; });
    shown = 30;
    render(terms);
    // Headlines that match too, when only words are searched (the filters are about questions).
    var hits = [];
    if (terms.length && !bank && !cat && !minF && !zone && !onlyNew) {
      for (var k = 0; k < news.length && hits.length < 8; k++) {
        var n = news[k], all = true;
        for (var m = 0; m < terms.length; m++) if (n.hay.indexOf(" " + terms[m]) < 0) { all = false; break; }
        if (all) hits.push(n);
      }
    }
    var re = marker(terms);
    newsBox.querySelector("ul").innerHTML = hits.map(function (n) {
      return '<li><a href="' + esc(n.u) + '" rel="noopener" lang="en" dir="ltr">' + mark(n.t, re) + '</a> <span class="muted">' + esc(n.s) + " · " + esc(n.d) + "</span></li>";
    }).join("");
    newsBox.hidden = hits.length === 0;
    if (!results.length && hits.length) status.textContent = box.dataset.none;
  }

  // Highlight the searched words (and their spelling variants) at the start of words in the text.
  function marker(terms) {
    var alts = [];
    terms.forEach(function (t) { alts.push(t); (groups[t] || []).forEach(function (v) { alts.push(flat(v)); }); });
    alts = alts.filter(Boolean).map(function (a) { return a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); });
    if (!alts.length) return null;
    alts.sort(function (a, b) { return b.length - a.length; });
    return new RegExp("(^|[^\\p{L}\\p{N}])(" + alts.join("|") + ")", "giu");
  }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function mark(text, re) {
    if (!re) return esc(text);
    var out = "", last = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(text))) {
      var start = m.index + m[1].length;
      out += esc(text.slice(last, start)) + "<mark>" + esc(m[2]) + "</mark>";
      last = start + m[2].length;
      if (m[0].length === 0) re.lastIndex++;
    }
    return out + esc(text.slice(last));
  }
  function snippet(it, re) {
    var text = it.s || it.a || "";
    if (re && it.a) {
      re.lastIndex = 0;
      if (!re.test(it.s || "")) {
        re.lastIndex = 0;
        var m = re.exec(it.a);
        if (m) {
          var at = Math.max(0, m.index - 60);
          text = (at > 0 ? "… " : "") + it.a.slice(at, at + 200) + (it.a.length > at + 200 ? " …" : "");
        }
      }
    }
    if (text.length > 220) text = text.slice(0, 220) + " …";
    return text;
  }

  function render(terms) {
    var re = marker(terms), n = results.length;
    status.textContent = n ? n + " " + (n === 1 ? box.dataset.resOne : box.dataset.resMany) : box.dataset.none;
    var html = "";
    results.slice(0, shown).forEach(function (r) {
      var it = r.it, ur = urdu && it.qu, q = ur ? it.qu : it.q;
      var en = urdu ? ' lang="en" dir="ltr"' : "";
      html += '<li><a href="' + esc(qPrefix + it.i + "/") + '"' + (ur ? "" : en) + ">" + mark(q, re) + "</a>" +
        '<p class="bp-snip"' + en + ">" + mark(snippet(it, re), re) + "</p>" +
        '<p class="bp-res-meta"><span>' + esc(bankNames[it.b] || it.b) + '</span> · <span class="bp-stars" title="' + esc(box.dataset["freq" + it.f] || "") + '">' +
        "★★★".slice(0, it.f) + "☆☆☆".slice(0, 3 - it.f) + '</span><span class="sr-only">' + esc(box.dataset["freq" + it.f] || "") + "</span>" +
        (parseDay(it.d).getTime() >= newAfter ? ' <span class="bp-badge bp-new">' + esc(box.dataset["new"]) + "</span>" : "") + "</p></li>";
    });
    list.innerHTML = html;
    list.hidden = n === 0;
    more.hidden = n <= shown;
  }

  more.addEventListener("click", function () { shown += 30; render(words(input.value, false)); });
  input.addEventListener("input", run);
  input.addEventListener("focus", load, { once: true });
  form.addEventListener("change", function (e) { if (e.target !== input) run(); });
  form.addEventListener("submit", function (e) { e.preventDefault(); input.blur(); run(); });
  form.addEventListener("reset", function () { setTimeout(run, 0); });

  // A shared link with ?q=...&bank=... opens with that search (FR-20).
  var p = new URLSearchParams(location.search);
  if (p.get("q")) input.value = p.get("q");
  if (p.get("bank")) fBank.value = p.get("bank");
  syncCats();
  if (p.get("cat")) fCat.value = p.get("cat");
  if (p.get("f")) fFreq.value = p.get("f");
  if (p.get("zone") && fZone) fZone.value = p.get("zone");
  if (p.get("new")) fNew.checked = true;
  if (fCat.value || fFreq.value || (fZone && fZone.value) || fNew.checked || fBank.value) form.querySelector(".bp-filters").open = true;
  if (active()) run();
})();
