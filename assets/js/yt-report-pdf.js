// The downloadable PDFs of the YouTube channel health report and the channel comparison.
// youtube.js loads this file (with jsPDF and html2canvas-pro from /assets/lib/) only when someone clicks
// "Download PDF". Like health-report-pdf.js, each A4 page is built with DOM nodes (never innerHTML), drawn with
// html2canvas-pro and saved as one PDF file, so Urdu, Chinese and German text look exactly as on the site.
// The page styles are the website checker's (.wpdf in main.css) plus a few .ypdf ones.
(function () {
  var PAGE_W = 794, PAGE_H = 1123; // A4 at 96 dpi
  var SEV = { high: "sev-high", medium: "sev-medium", low: "sev-low", good: "sev-good" };

  window.ytReportPdf = function (kind, data, k) {
    var tr = k.tr, h = k.h, num = k.num, short = k.short;
    var holder = h("div", { class: "wpdf", dir: k.rtl ? "rtl" : "ltr", lang: k.lang, "aria-hidden": "true" });
    document.body.appendChild(holder);
    var made = new Date().toISOString();
    var title = kind === "compare" ? tr("ytvs_pdf_title") : tr("ytrep_pdf_title");
    var who = kind === "compare" ? data.A.title + " · " + data.B.title : data.title;

    // ---------- Pages ----------
    var pages = [];
    function newPage(cover) {
      var body = h("div", { class: "wpdf-body" });
      var page = h("section", { class: "wpdf-page" + (cover ? " wpdf-cover" : "") },
        cover ? null : h("header", { class: "wpdf-head" }, h("span", { dir: "auto" }, title, " · ", who), h("span", null, k.date(made))),
        body,
        cover ? null : h("footer", { class: "wpdf-foot" },
          h("span", { class: "wpdf-link", "data-url": "https://" + location.host + "/" }, location.host),
          h("span", { class: "wpdf-num" })));
      holder.appendChild(page);
      pages.push(page);
      return body;
    }
    var body = null;
    function overflows(b) { return b.scrollHeight > b.clientHeight + 1; }
    function spaceLeft(b) {
      var last = b.lastElementChild;
      return last ? b.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom : b.clientHeight;
    }
    // Adds a block, starting a new page when it doesn't fit (newPage: true always, "soft" when a third or less is left).
    function add(block, opts) {
      if (!block) return;
      var np = opts && opts.newPage;
      if (!body || np === true || (np === "soft" && spaceLeft(body) < 340)) body = newPage();
      body.appendChild(block);
      if (overflows(body) && body.childNodes.length > 1) {
        body.removeChild(block);
        body = newPage();
        body.appendChild(block);
      }
    }
    // A list split into one block per item, so a long list can carry on over the next page.
    function addList(heading, items) {
      items.forEach(function (it, i) { add(i === 0 ? h("div", null, heading, it) : it); });
    }

    if (kind === "compare") compareDoc(data.A, data.B); else healthDoc(data);

    pages.forEach(function (p, i) {
      var n = p.querySelector(".wpdf-num");
      if (n) n.textContent = tr("ytrep_pdf_page", { n: num(i + 1), t: num(pages.length) });
    });

    // ---------- Draw ----------
    var pdf = new window.jspdf.jsPDF({ unit: "mm", format: "a4", compress: true });
    var scale = 210 / PAGE_W;
    var chain = Promise.resolve();
    pages.forEach(function (page, i) {
      chain = chain.then(function () {
        return window.html2canvas(page, { scale: 1.75, backgroundColor: "#ffffff", logging: false, width: PAGE_W, height: PAGE_H, windowWidth: PAGE_W, onclone: stylesReady });
      }).then(function (canvas) {
        if (i) pdf.addPage();
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.85), "JPEG", 0, 0, 210, 297, undefined, "FAST");
        var base = page.getBoundingClientRect();
        [].forEach.call(page.querySelectorAll(".wpdf-link"), function (a) {
          var b = a.getBoundingClientRect();
          pdf.link((b.left - base.left) * scale, (b.top - base.top) * scale, b.width * scale, b.height * scale, { url: a.getAttribute("data-url") });
        });
      });
    });
    return chain.then(function () {
      pdf.setProperties({ title: title + " · " + who, creator: k.brand + " · " + location.host });
      var slug = function (c) { return String(c.handle || c.id).replace(/[^a-z0-9_-]/gi, ""); };
      var name = kind === "compare" ? "channel-comparison-" + slug(data.A) + "-vs-" + slug(data.B) : "channel-report-" + slug(data);
      pdf.save(name + "-" + made.slice(0, 10) + ".pdf");
    }).then(function () { holder.remove(); }, function (e) { holder.remove(); throw e; });

    // ---------- The health report ----------
    function healthDoc(r) {
      var cover = newPage(true);
      cover.appendChild(coverBand(tr("ytrep_pdf_title"), r.title, (r.handle || r.id) + " · " + (r.subscribers == null ? tr("yt_subs_hidden") : tr("yt_subs_n", { n: short(r.subscribers) })), r));
      cover.appendChild(h("div", { class: "wpdf-cover-score" },
        k.ring(r.overall, r.grade),
        h("div", null,
          h("p", { class: "wpdf-label" }, tr("ytrep_overall")),
          h("p", { class: "wpdf-big" }, r.overall == null ? "–" : num(r.overall) + " / 100"),
          h("p", { class: "wpdf-gradeline" }, tr("ytrep_sum_" + (r.grade || "na"))))));
      cover.appendChild(partTiles(r));
      cover.appendChild(h("p", { class: "wpdf-cover-note" }, k.basedOn(r) + " " + tr("ytrep_note")));

      add(h("h2", null, tr("ytrep_pdf_summary")), { newPage: true });
      add(h("p", { class: "wpdf-lead" }, tr("ytrep_sum_" + (r.grade || "na")) + " " + k.basedOn(r)));
      add(h("div", null, h("h3", null, tr("ytrep_parts")), scoreTable(r)));
      add(h.apply(null, ["div", { class: "ypdf-why" }].concat(k.PARTS.map(function (p) { return h("p", null, h("strong", null, tr("ytrep_part_" + p) + ": "), tr("ytrep_part_" + p + "_why")); }))));
      addTips(tr("ytrep_tips"), r.tips.map(function (t) { return { sev: t.sev, text: null, t: t }; }), r.tips.length ? null : tr("ytrep_tips_none"));

      add(h("h2", { class: "wpdf-h-gap" }, tr("ytrep_numbers", { p: k.periodIn(r) })), { newPage: "soft" });
      add(factList(k.numbers(r)));
      if (r.uploads.length > 1) add(h("div", null, h("h3", null, tr("ytrep_chart_views")), columns(r)));
      if (r.uploads.length >= 4) {
        var day = k.weekdays(r);
        add(h("div", null, h("h3", null, tr("ytrep_days_title")), day.best ? h("p", { class: "wpdf-note" }, tr("ytrep_best_day", { d: day.best.name })) : null, day.el));
      }
      var best = k.settled(r).slice().sort(function (a, b) { return (b.views || 0) - (a.views || 0); });
      if (best.length) {
        add(h("h2", { class: "wpdf-h-gap" }, tr("ytrep_pdf_videos")), { newPage: "soft" });
        addList(h("h3", null, tr("ytrep_best")), best.slice(0, 5).map(videoRow));
        if (best.length >= 8) addList(h("h3", null, tr("ytrep_worst")), best.slice(-5).reverse().map(videoRow));
      }
      add(h("div", null, h("h3", null, tr("ytrep_seo")), factList(k.seoFacts(r))), { newPage: "soft" });
      about();
    }

    // ---------- The comparison ----------
    function compareDoc(A, B) {
      var v = k.vsVerdict(A, B), g = k.tagGaps(A, B);
      var plan = v.back ? k.catchUp(v.lead, v.back) : null;
      var cover = newPage(true);
      cover.appendChild(coverBand(tr("ytvs_pdf_title"), A.title + "  ·  " + B.title, tr("ytvs_period", { p: k.periodIn(A) }), A));
      cover.appendChild(h.apply(null, ["div", { class: "ypdf-rings" }].concat(
        [A, B].map(function (c) {
          return h("div", null, k.ring(c.overall, c.grade), h("p", { class: "ypdf-ring-name", dir: "auto" }, c.title),
            h("p", { class: "wpdf-note" }, c.subscribers == null ? tr("yt_subs_hidden") : tr("yt_subs_n", { n: short(c.subscribers) })));
        }))));
      cover.appendChild(h("p", { class: "wpdf-lead ypdf-verdict" }, v.text));
      cover.appendChild(h("p", { class: "wpdf-cover-note" }, tr("ytrep_note")));

      add(h("h2", null, tr("ytvs_pdf_side")), { newPage: true });
      add(vsTable(A, B));
      if (plan) {
        addTips(tr("ytvs_plan", { name: v.back.title }), plan.tips, plan.tips.length ? null : tr("ytvs_plan_none"), { newPage: "soft" });
        var gaps = v.back === A ? g.onlyB : g.onlyA;
        if (gaps.length) add(h("p", { class: "wpdf-note" }, tr("ytvs_do_topics", { name: v.lead.title, t: gaps.slice(0, 8).join(", ") })));
        if (plan.keep.length) addTips(tr("ytvs_keep", { name: v.back.title }), plan.keep);
      }
      [A, B].forEach(function (c, i) {
        add(h("h2", { class: "wpdf-h-gap", dir: "auto" }, c.title), { newPage: "soft" });
        add(h("p", { class: "wpdf-note" }, k.basedOn(c)));
        add(scoreTable(c));
        if (c.tips.length) addTips(tr("ytrep_tips"), c.tips.slice(0, 6).map(function (t) { return { sev: t.sev, t: t }; }));
      });
      add(h("div", null, h("h3", null, tr("ytvs_shared", { n: num(g.shared.length) })),
        h("p", { class: "ypdf-tags", dir: "auto" }, g.shared.length ? g.shared.join(", ") : tr("ytvs_shared_none"))), { newPage: "soft" });
      if (g.onlyA.length) add(h("div", null, h("h3", { dir: "auto" }, tr("ytvs_only", { name: A.title })), h("p", { class: "ypdf-tags", dir: "auto" }, g.onlyA.join(", "))));
      if (g.onlyB.length) add(h("div", null, h("h3", { dir: "auto" }, tr("ytvs_only", { name: B.title })), h("p", { class: "ypdf-tags", dir: "auto" }, g.onlyB.join(", "))));
      about();
    }

    // ---------- Pieces ----------
    function coverBand(heading, name, line, r) {
      return h("div", { class: "wpdf-cover-band" },
        h("p", { class: "wpdf-brand" }, k.brand, " · ", location.host),
        h("h1", null, heading),
        h("p", { class: "wpdf-host", dir: "auto" }, name),
        h("p", { class: "wpdf-url", dir: "auto" }, line),
        h("p", { class: "wpdf-date" }, tr("ytrep_pdf_made", { t: k.date(made), p: k.periodIn(r) })));
    }
    function partTiles(r) {
      var ul = h("ul", { class: "wpdf-tiles" });
      k.PARTS.forEach(function (p) {
        var s = r.scores[p];
        ul.appendChild(h("li", null, h("span", null, tr("ytrep_part_" + p)), h("b", { class: "g-" + k.scoreClass(s) }, s == null ? "–" : num(s))));
      });
      return ul;
    }
    function scoreTable(r) {
      var table = h("table", { class: "wpdf-scores" });
      k.PARTS.forEach(function (p) {
        var s = r.scores[p];
        var fillEl = h("i", { class: "g-" + k.scoreClass(s) });
        fillEl.style.width = (s == null ? 0 : s) + "%";
        table.appendChild(h("tr", null,
          h("th", { scope: "row" }, tr("ytrep_part_" + p)),
          h("td", { class: "wpdf-bar" }, h("span", null, fillEl)),
          h("td", { class: "wpdf-score g-" + k.scoreClass(s) }, s == null ? "–" : num(s))));
      });
      return table;
    }
    function addTips(heading, tips, empty, opts) {
      var hd = h("h3", null, heading);
      if (!tips.length) { add(h("div", null, hd, h("p", { class: "wpdf-good" }, empty || "")), opts); return; }
      tips.forEach(function (t, i) {
        var text = t.text || (t.t ? tipOf(t.t) : "");
        var item = h("div", { class: "wpdf-top ypdf-tip " + (SEV[t.sev] || "") },
          h("span", { class: "wpdf-top-n" }, num(i + 1)),
          h("div", null, h("p", null, text)));
        add(i === 0 ? h("div", null, hd, item) : item, i === 0 ? opts : null);
      });
    }
    function tipOf(t) {
      var n = t.n == null ? "" : typeof t.n === "number" ? num(t.n) : t.n;
      return tr("ytrep_tip_" + t.code, { n: n });
    }
    function factList(pairs) {
      var dl = h("dl", { class: "web-facts" });
      pairs.forEach(function (p) { if (p && p[1] != null && p[1] !== "") dl.appendChild(h("div", null, h("dt", null, p[0]), h("dd", { dir: "auto" }, String(p[1])))); });
      return dl;
    }
    // Views per upload as columns (plain boxes draw more reliably into the PDF than an SVG).
    function columns(r) {
      var vids = r.uploads.slice().reverse().slice(-60);
      var max = Math.max.apply(null, vids.map(function (v) { return v.views || 0; })) || 1;
      var box = h("div", { class: "ypdf-cols" });
      vids.forEach(function (v) {
        var c = h("i", { class: v.score >= 3 ? "is-hot" : null });
        c.style.height = Math.max(1.5, ((v.views || 0) / max) * 100) + "%";
        box.appendChild(c);
      });
      if (r.medianViews) {
        var m = h("b", { class: "ypdf-median" });
        m.style.bottom = (r.medianViews / max) * 100 + "%";
        box.appendChild(m);
      }
      return h("div", null, box,
        h("p", { class: "ypdf-cols-key" },
          h("span", null, k.date(vids[0].published)),
          h("span", null, tr("ytrep_median_line", { n: short(r.medianViews) }) + " · " + tr("ytrep_hot_bars")),
          h("span", null, k.date(vids[vids.length - 1].published))));
    }
    function videoRow(v) {
      return h("div", { class: "ypdf-video" },
        h("p", { dir: "auto" }, h("span", { class: "wpdf-link", "data-url": "https://www.youtube.com/watch?v=" + v.id }, v.title)),
        h("p", { class: "wpdf-note" }, tr("yt_views_n", { n: short(v.views) }) + " · " + k.date(v.published) + (v.duration ? " · " + k.clock(v.duration) : "") + (v.score != null ? " · ×" + num(v.score) : "")));
    }
    function vsTable(A, B) {
      var table = h("table", { class: "ypdf-vs" });
      table.appendChild(h("tr", null, h("th", null, ""), h("th", { dir: "auto" }, A.title), h("th", { dir: "auto" }, B.title)));
      var rows = k.vsRows(A, B).concat(k.PARTS.map(function (p) { return ["ytrep_part_" + p, A.scores[p], B.scores[p], num]; }));
      rows.forEach(function (x) {
        var a = x[1], b = x[2], f = x[3], win = -1;
        if (a != null && b != null && a !== b) {
          if (x[4] === "older") win = Date.parse(a) < Date.parse(b) ? 0 : 1;
          else if (x[4] === "newer") win = Date.parse(a) > Date.parse(b) ? 0 : 1;
          else win = a > b ? 0 : 1;
        }
        table.appendChild(h("tr", null, h("th", { scope: "row" }, tr(x[0])),
          h("td", { class: win === 0 ? "is-win" : null }, a == null ? tr("yt_hidden") : f(a)),
          h("td", { class: win === 1 ? "is-win" : null }, b == null ? tr("yt_hidden") : f(b))));
      });
      return table;
    }
    function about() {
      add(h("div", { class: "wpdf-about" },
        h("h2", null, tr("ytrep_pdf_about")),
        h("p", null, tr("ytrep_pdf_method")),
        h("p", null, tr("ytrep_note")),
        h("p", null, tr("ytrep_pdf_online"), " ", h("span", { class: "wpdf-link", "data-url": k.url }, k.url))), { newPage: "soft" });
    }
    function stylesReady(doc) {
      var links = [].slice.call(doc.querySelectorAll('link[rel="stylesheet"]'));
      var waits = links.map(function (l) {
        if (l.sheet) return Promise.resolve();
        return new Promise(function (ok) { l.addEventListener("load", ok); l.addEventListener("error", ok); });
      });
      if (doc.fonts && doc.fonts.ready) waits.push(doc.fonts.ready);
      return Promise.race([Promise.all(waits), new Promise(function (ok) { setTimeout(ok, 8000); })]);
    }
  };
})();
