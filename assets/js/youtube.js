// The YouTube creator tools (/tools/youtube/): tag extractor, transcript extractor, channel details, channel health
// report, video SEO score, outlier finder, channel comparison, keyword ideas and thumbnail downloader. The page asks the site's Worker
// (worker/src/yt.js), which uses the official YouTube Data API with a key kept on the server. Like tools.js, results are built with DOM nodes, never innerHTML, so a video title
// or description can't run as code.
(function () {
  var box = document.querySelector(".tool.yt");
  if (!box) return;
  var API = (box.getAttribute("data-api") || "").replace(/\/+$/, "");
  var root = document.documentElement, rtl = root.getAttribute("dir") === "rtl", lang = root.getAttribute("lang") || "en";

  var TEXT = {};
  try { TEXT = JSON.parse(document.getElementById("tools-text").textContent) || {}; } catch (e) {}
  function tr(key, vars) {
    var s = TEXT[key] || key;
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return k in vars ? (rtl ? "⁨" + vars[k] + "⁩" : String(vars[k])) : m; });
    return s;
  }
  function num(n) { return n == null ? "–" : new Intl.NumberFormat(lang).format(n); }
  function short(n) { return n == null ? "–" : new Intl.NumberFormat(lang, { notation: "compact", maximumFractionDigits: 1 }).format(n); }
  function date(iso) { return iso ? new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(new Date(iso)) : "–"; }
  function clock(sec) {
    sec = Math.floor(sec);
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(s).padStart(2, "0");
  }
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
  function fill(el) {
    el.textContent = "";
    for (var i = 1; i < arguments.length; i++) if (arguments[i]) el.appendChild(arguments[i]);
  }
  function copyBtn(label, getText) {
    var b = h("button", { type: "button", class: "btn btn-sm" }, h("span", { text: label }));
    b.addEventListener("click", function () {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(getText()).then(function () {
        var span = b.querySelector("span"), before = span.textContent;
        span.textContent = tr("copied");
        setTimeout(function () { span.textContent = before; }, 1600);
      });
    });
    return b;
  }
  function saveBtn(label, name, type, getText) {
    var b = h("button", { type: "button", class: "btn btn-sm" }, h("span", { text: label }));
    b.addEventListener("click", function () {
      var url = URL.createObjectURL(new Blob([getText()], { type: type }));
      var a = h("a", { href: url, download: name });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    });
    return b;
  }
  function msg(text, cls) { return h("p", { class: "tool-msg" + (cls ? " " + cls : "") }, text); }
  function busy(out) { fill(out, h("p", { class: "tool-msg yt-busy" }, tr("yt_loading"))); }
  function chips(list, label) {
    var ul = h("ul", { class: "tags yt-tags", dir: "auto", "aria-label": label || null });
    list.forEach(function (t) { ul.appendChild(t instanceof Node ? h("li", null, t) : h("li", { dir: "auto" }, t)); });
    return ul;
  }
  function section(title) {
    var s = h("section", { class: "yt-sec" }, h("h3", { class: "yt-h" }, title));
    for (var i = 1; i < arguments.length; i++) if (arguments[i]) s.appendChild(arguments[i]);
    return s;
  }
  function row() {
    var d = h("div", { class: "btn-row" });
    for (var i = 0; i < arguments.length; i++) if (arguments[i]) d.appendChild(arguments[i]);
    return d;
  }
  function facts(pairs) {
    var dl = h("dl", { class: "kv yt-kv" });
    pairs.forEach(function (p) { if (p && p[1] != null && p[1] !== "") { dl.appendChild(h("dt", null, p[0])); dl.appendChild(h("dd", { dir: "auto" }, String(p[1]))); } });
    return dl;
  }
  function ytLink(path, text) { return h("a", { href: "https://www.youtube.com/" + path, rel: "noopener", target: "_blank" }, text); }

  // Errors come back as {error: code}; each code has its own sentence (yt_err_* in _data/tools.yml).
  // A request that doesn't reach the server at all (a dropped connection, a server restarting) is tried once more.
  function call(route, params) {
    var q = new URLSearchParams(params).toString();
    var get = function () { return fetch(API + "/yt/" + route + "?" + q); };
    return get().catch(function () { return new Promise(function (ok) { setTimeout(ok, 1200); }).then(get); }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || j.error) throw new Error(j.error || "upstream");
        return j;
      });
    }, function () { throw new Error("network"); });
  }
  function errorText(e) {
    var k = "yt_err_" + (e && e.message);
    return TEXT[k] ? tr(k) : tr("yt_err_upstream");
  }

  // A small video id check, so obvious typos are caught without asking the server.
  function videoId(s) {
    s = String(s || "").trim();
    if (/^[\w-]{11}$/.test(s)) return s;
    var m = s.match(/(?:youtu\.be\/|[?&]v=|\/(?:shorts|embed|live|v|e)\/)([\w-]{11})(?![\w-])/);
    return m && /(^|\/\/|\.)(youtube(-nocookie)?\.com|youtu\.be)\//i.test(s.replace(/^(?!https?:)/i, "https://")) ? m[1] : null;
  }

  // Each tool's form. ?v= or ?c= (or ?q=) in the page address fills the box and runs it, so tools can link to each other.
  function wire(id, param, run) {
    var form = document.getElementById(id + "-form"), input = document.getElementById(id + "-input");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (!v) { input.focus(); return; }
      var u = new URL(location.href);
      u.searchParams.set(param, v);
      history.replaceState(null, "", u);
      run(v);
    });
    var start = new URLSearchParams(location.search).get(param);
    if (start) { input.value = start; run(start); }
  }
  function toolUrl(slug, param, value) {
    var prefix = lang === "en" ? "" : "/" + lang;
    return prefix + "/tools/youtube/" + slug + "/?" + param + "=" + encodeURIComponent(value);
  }

  // A video's picture, title, channel and numbers, at the top of a result.
  function videoHead(v) {
    return h("div", { class: "yt-head" },
      h("img", { class: "yt-thumb", src: "https://i.ytimg.com/vi/" + v.id + "/mqdefault.jpg", alt: "", width: "160", height: "90", loading: "lazy" }),
      h("div", null,
        h("p", { class: "yt-title", dir: "auto" }, ytLink("watch?v=" + v.id, v.title || v.id)),
        v.channel ? h("p", { class: "tool-msg", dir: "auto" }, v.channelId ? ytLink("channel/" + v.channelId, v.channel) : v.channel) : null,
        v.views != null ? h("p", { class: "tool-msg" }, tr("yt_views_n", { n: short(v.views) }) + " · " + date(v.published)) : null));
  }

  // ---------- Tag extractor ----------
  var tagOut = document.getElementById("yttag-out");
  if (tagOut) wire("yttag", "v", function (value) {
    if (!videoId(value)) { fill(tagOut, msg(tr("yt_err_bad_video"), "bad")); return; }
    busy(tagOut);
    call("video", { v: value, hl: lang }).then(function (v) {
      var tags = v.tags || [];
      var tagSec = tags.length
        ? section(tr("yttag_found", { n: num(tags.length) }),
            chips(tags),
            msg(tr("yttag_chars", { n: num(v.tagChars) })),
            row(copyBtn(tr("yt_copy_comma"), function () { return tags.join(", "); }),
                copyBtn(tr("yt_copy_lines"), function () { return tags.join("\n"); }),
                copyBtn(tr("yttag_copy_hash"), function () { return tags.map(function (t) { return "#" + t.replace(/\s+/g, ""); }).join(" "); })))
        : section(tr("yttag_found", { n: 0 }), msg(tr("yttag_none")));
      fill(tagOut,
        videoHead(v),
        tagSec,
        v.hashtags && v.hashtags.length ? section(tr("yttag_hashtags"), chips(v.hashtags), row(copyBtn(tr("yt_copy_all"), function () { return v.hashtags.join(" "); }))) : null,
        section(tr("yt_details"), facts([
          [tr("yt_category"), v.category],
          [tr("yt_published"), date(v.published)],
          [tr("yt_duration"), v.duration ? clock(v.duration) : null],
          [tr("yt_language"), v.language ? langName(v.language) : null],
          [tr("yt_views"), num(v.views)],
          [tr("yt_likes"), v.likes == null ? tr("yt_hidden") : num(v.likes)],
          [tr("yt_comments"), v.comments == null ? tr("yt_off") : num(v.comments)],
          [tr("yt_captions"), v.captions ? tr("yt_yes") : tr("yt_no")],
        ])),
        row(h("a", { class: "btn btn-sm", href: toolUrl("channel-keywords", "c", v.channelId) }, h("span", { text: tr("yttag_to_channel") })),
            h("a", { class: "btn btn-sm", href: toolUrl("transcript-extractor", "v", v.id) }, h("span", { text: tr("yttag_to_script") })),
            h("a", { class: "btn btn-sm", href: toolUrl("thumbnail-downloader", "v", v.id) }, h("span", { text: tr("yttag_to_thumb") }))));
    }, function (e) { fill(tagOut, msg(errorText(e), "bad")); });
  });

  function langName(code) {
    try { return new Intl.DisplayNames([lang], { type: "language" }).of(code) || code; } catch (e) { return code; }
  }

  // ---------- Transcript extractor ----------
  var scriptOut = document.getElementById("ytscript-out");
  if (scriptOut) {
    var times = document.getElementById("ytscript-times"), current = null;
    // Lines into paragraphs: a new one after a pause of 2 seconds or about every 40 seconds.
    var asText = function (lines, withTimes) {
      if (withTimes) return lines.map(function (l) { return "[" + clock(l.t) + "] " + l.text; }).join("\n");
      var paras = [], cur = [], start = 0, prevEnd = 0;
      lines.forEach(function (l) {
        if (cur.length && (l.t - prevEnd > 2 || l.t - start > 40)) { paras.push(cur.join(" ")); cur = []; }
        if (!cur.length) start = l.t;
        cur.push(l.text);
        prevEnd = l.t + (l.d || 5);
      });
      if (cur.length) paras.push(cur.join(" "));
      return paras.join("\n\n");
    };
    var asSrt = function (lines) {
      function ts(s) {
        var ms = Math.round(s * 1000), hh = Math.floor(ms / 3600000), mm = Math.floor(ms / 60000) % 60, ss = Math.floor(ms / 1000) % 60;
        return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0") + "," + String(ms % 1000).padStart(3, "0");
      }
      return lines.map(function (l, i) {
        var end = l.d ? l.t + l.d : (lines[i + 1] ? lines[i + 1].t : l.t + 2);
        return (i + 1) + "\n" + ts(l.t) + " --> " + ts(end) + "\n" + l.text + "\n";
      }).join("\n");
    };
    var showScript = function () {
      var r = current;
      if (!r) return;
      var text = asText(r.lines, times.checked && !r.pasted);
      var words = text.replace(/\[\d[\d:]*\]/g, " ").split(/\s+/).filter(Boolean).length;
      var area = h("textarea", { class: "field yt-script", rows: "14", readonly: "", dir: "auto", "aria-label": tr("ytscript_result") });
      area.value = text;
      var pick = null;
      if (r.tracks && r.tracks.length > 1) {
        pick = h("select", { class: "field field-inline", id: "ytscript-lang" });
        r.tracks.forEach(function (t) {
          var o = h("option", { value: t.lang }, (t.name || langName(t.lang)) + (t.auto ? " (" + tr("ytscript_auto") + ")" : ""));
          if (t.lang === r.lang && t.auto === r.auto) o.selected = true;
          pick.appendChild(o);
        });
        pick.addEventListener("change", function () { loadScript(r.id, pick.value); });
        pick = h("label", { class: "check" }, h("span", { text: tr("ytscript_track") }), pick);
      }
      var base = r.id || "transcript";
      fill(scriptOut,
        r.id ? videoHead({ id: r.id, title: r.title, channel: r.channel }) : null,
        pick ? h("div", { class: "check-row" }, pick) : null,
        msg(tr("ytscript_stats", { lines: num(r.lines.length), words: num(words) }) + (r.auto ? " · " + tr("ytscript_auto") : "")),
        area,
        row(copyBtn(tr("yt_copy_all"), function () { return area.value; }),
            saveBtn(tr("ytscript_txt"), base + ".txt", "text/plain;charset=utf-8", function () { return area.value; }),
            r.pasted ? null : saveBtn(tr("ytscript_srt"), base + ".srt", "application/x-subrip;charset=utf-8", function () { return asSrt(r.lines); })));
    };
    var loadScript = function (value, want) {
      if (!videoId(value)) { fill(scriptOut, msg(tr("yt_err_bad_video"), "bad")); return; }
      busy(scriptOut);
      var params = { v: value };
      if (want) params.lang = want;
      call("transcript", params).then(function (r) { current = r; showScript(); }, function (e) {
        current = null;
        fill(scriptOut, msg(errorText(e), "bad"), msg(tr("ytscript_try_paste")));
        document.getElementById("ytscript-paste").open = true;
      });
    };
    wire("ytscript", "v", function (v) { loadScript(v); });
    times.addEventListener("change", showScript);

    // Pasted from YouTube's "Show transcript" panel: lines of times ("0:04", "1:02:03", "4 seconds") and text.
    document.getElementById("ytscript-clean").addEventListener("click", function () {
      var raw = document.getElementById("ytscript-pasted").value;
      var lines = [], t = 0;
      raw.split(/\r?\n/).forEach(function (line) {
        var s = line.trim();
        if (!s) return;
        var m = s.match(/^\[?(\d{1,2}(?::\d{2}){1,2})\]?\s*(.*)$/);
        if (m) {
          t = m[1].split(":").reduce(function (a, b) { return a * 60 + +b; }, 0);
          s = m[2].trim();
          if (!s) return;
        }
        // The panel's spoken-out times, e.g. "1 minute, 4 seconds" (in any language: digits followed by short words).
        if (/^\d+\s+[^\d\s,،]{1,12}(?:[,،]\s*\d+\s+[^\d\s,،]{1,12})*$/.test(s)) return;
        lines.push({ t: t, d: 0, text: s.replace(/\s+/g, " ") });
      });
      if (!lines.length) { fill(scriptOut, msg(tr("ytscript_paste_empty"), "bad")); return; }
      current = { lines: lines, pasted: true };
      showScript();
    });
  }

  // ---------- Channel details and keywords ----------
  var chanOut = document.getElementById("ytchan-out");
  if (chanOut) wire("ytchan", "c", function (value) {
    busy(chanOut);
    call("channel", { c: value, hl: lang }).then(function (c) {
      var link = c.handle ? c.handle : "channel/" + c.id;
      var region = null;
      try { region = c.country ? new Intl.DisplayNames([lang], { type: "region" }).of(c.country) : null; } catch (e) { region = c.country; }
      var tagNames = (c.tags || []).map(function (t) { return t.tag; });
      var top = h("ol", { class: "yt-list" });
      (c.top || []).forEach(function (v) {
        top.appendChild(h("li", null,
          h("img", { src: "https://i.ytimg.com/vi/" + v.id + "/mqdefault.jpg", alt: "", width: "96", height: "54", loading: "lazy" }),
          h("span", { dir: "auto" }, ytLink("watch?v=" + v.id, v.title), h("small", null, tr("yt_views_n", { n: short(v.views) }) + " · " + date(v.published))),
          h("a", { class: "btn btn-sm", href: toolUrl("tag-extractor", "v", v.id), title: tr("ytchan_get_tags") }, h("span", { text: tr("ytchan_tags_btn") }))));
      });
      fill(chanOut,
        h("div", { class: "yt-head yt-chan" },
          c.thumb ? h("img", { class: "yt-avatar", src: c.thumb, alt: "", width: "72", height: "72", loading: "lazy" }) : null,
          h("div", null,
            h("p", { class: "yt-title", dir: "auto" }, ytLink(link, c.title)),
            h("p", { class: "tool-msg", dir: "ltr" }, (c.handle || c.id)),
            h("p", { class: "tool-msg" }, (c.subscribers == null ? tr("yt_subs_hidden") : tr("yt_subs_n", { n: short(c.subscribers) })) + " · " + tr("yt_videos_n", { n: num(c.videos) })))),
        section(tr("yt_details"), facts([
          [tr("yt_subscribers"), c.subscribers == null ? tr("yt_hidden") : num(c.subscribers)],
          [tr("ytchan_total_views"), num(c.views)],
          [tr("ytchan_videos"), num(c.videos)],
          [tr("ytchan_created"), date(c.created)],
          [tr("ytchan_country"), region],
          [tr("ytchan_avg", { n: num(c.sample) }), c.sample ? num(c.avgViews) : null],
          [tr("ytchan_per_week"), c.perWeek != null ? num(c.perWeek) : null],
          [tr("ytchan_last"), c.lastUpload ? date(c.lastUpload) : null],
          [tr("ytchan_id"), c.id],
        ])),
        section(tr("ytchan_keywords"),
          c.keywords.length ? chips(c.keywords) : msg(tr("ytchan_keywords_none")),
          c.keywords.length ? row(copyBtn(tr("yt_copy_comma"), function () { return c.keywords.join(", "); })) : null),
        section(tr("ytchan_tags", { n: num(c.sample) }),
          tagNames.length ? chips(c.tags.map(function (t) { return h("span", { dir: "auto" }, t.tag, h("b", { class: "yt-n" }, " ×" + num(t.n))); })) : msg(tr("ytchan_tags_none")),
          tagNames.length ? row(copyBtn(tr("yt_copy_comma"), function () { return tagNames.join(", "); })) : null),
        c.topics.length ? section(tr("ytchan_topics"), chips(c.topics)) : null,
        c.top && c.top.length ? section(tr("ytchan_top"), top) : null,
        c.description ? h("details", { class: "yt-desc" }, h("summary", null, tr("ytchan_about")), h("p", { dir: "auto" }, c.description)) : null,
        row(h("a", { class: "btn btn-primary btn-sm", href: toolUrl("channel-health-report", "c", c.handle || c.id) }, h("span", { text: tr("ytchan_to_report") })),
            h("a", { class: "btn btn-sm", href: toolUrl("outlier-finder", "c", c.id) }, h("span", { text: tr("ytout_title") }))));
    }, function (e) { fill(chanOut, msg(errorText(e), "bad")); });
  });

  // ---------- Keyword ideas ----------
  var kwOut = document.getElementById("ytkw-out");
  if (kwOut) {
    // Country and language names in the page's language.
    var names = function (sel, type) {
      var dn;
      try { dn = new Intl.DisplayNames([lang], { type: type }); } catch (e) { return; }
      Array.prototype.forEach.call(sel.options, function (o) { if (o.value) try { o.textContent = dn.of(o.value); } catch (e) {} });
      var opts = Array.prototype.slice.call(sel.options), selected = sel.value;
      opts.sort(function (a, b) { return a.textContent.localeCompare(b.textContent, lang); }).forEach(function (o) { sel.appendChild(o); });
      sel.value = selected;
    };
    document.querySelectorAll("#ytkw .yt-region").forEach(function (s) { names(s, "region"); });
    document.querySelectorAll("#ytkw .yt-lang").forEach(function (s) { names(s, "language"); });

    var seedForm = document.getElementById("ytkw-form"), trendForm = document.getElementById("ytkw-trend");
    var modeBtns = document.querySelectorAll("#ytkw .chip-btn"), catsFor = null;
    var setMode = function (mode) {
      modeBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-mode") === mode)); });
      seedForm.hidden = mode !== "seed";
      trendForm.hidden = mode !== "trend";
      kwOut.textContent = "";
      if (mode === "trend") loadCats();
    };
    modeBtns.forEach(function (b) { b.addEventListener("click", function () { setMode(b.getAttribute("data-mode")); }); });

    var idea = function (text) {
      var b = h("button", { type: "button", class: "yt-idea", dir: "auto", title: tr("ytkw_dig") }, text);
      b.addEventListener("click", function () { document.getElementById("ytkw-input").value = text; seedForm.requestSubmit(); });
      return b;
    };
    var runSeed = function (value) {
      busy(kwOut);
      call("suggest", { q: value, hl: document.getElementById("ytkw-hl").value, gl: document.getElementById("ytkw-gl").value }).then(function (r) {
        var all = r.top.concat(r.questions);
        r.letters.forEach(function (g) { all = all.concat(g.ideas); });
        var az = h("div", { class: "yt-az" });
        r.letters.forEach(function (g) { az.appendChild(h("div", null, h("h4", { class: "yt-letter" }, g.label.toUpperCase()), chips(g.ideas.map(idea)))); });
        fill(kwOut,
          msg(tr("ytkw_count", { n: num(r.count), q: r.q })),
          row(copyBtn(tr("yt_copy_comma"), function () { return all.join(", "); }),
              copyBtn(tr("yt_copy_lines"), function () { return all.join("\n"); }),
              saveBtn(tr("ytkw_csv"), "youtube-keywords-" + r.q.replace(/[^\p{L}\p{N}]+/gu, "-") + ".csv", "text/csv;charset=utf-8", function () {
                return "﻿keyword\n" + all.map(function (k) { return '"' + k.replace(/"/g, '""') + '"'; }).join("\n");
              })),
          r.top.length ? section(tr("ytkw_top"), chips(r.top.map(idea))) : null,
          r.questions.length ? section(tr("ytkw_questions"), chips(r.questions.map(idea))) : null,
          r.letters.length ? section(tr("ytkw_az"), az) : null);
      }, function (e) { fill(kwOut, msg(errorText(e), "bad")); });
    };
    wire("ytkw", "q", runSeed);

    var catSel = document.getElementById("ytkw-cat"), tgl = document.getElementById("ytkw-tgl");
    var loadCats = function () {
      if (catsFor === tgl.value) return;
      catsFor = tgl.value;
      call("categories", { gl: tgl.value, hl: lang }).then(function (r) {
        var keep = catSel.value;
        while (catSel.options.length > 1) catSel.remove(1);
        r.categories.forEach(function (c) { catSel.appendChild(h("option", { value: c.id }, c.title)); });
        catSel.value = keep;
        if (catSel.value !== keep) catSel.value = "";
      }, function (e) { catsFor = null; fill(kwOut, msg(errorText(e), "bad")); });
    };
    tgl.addEventListener("change", loadCats);
    trendForm.addEventListener("submit", function (e) {
      e.preventDefault();
      busy(kwOut);
      call("trending", { gl: tgl.value, cat: catSel.value, hl: lang }).then(function (r) {
        var names = r.tags.map(function (t) { return t.tag; });
        var vids = h("ol", { class: "yt-list" });
        r.videos.forEach(function (v) {
          vids.appendChild(h("li", null,
            h("img", { src: "https://i.ytimg.com/vi/" + v.id + "/mqdefault.jpg", alt: "", width: "96", height: "54", loading: "lazy" }),
            h("span", { dir: "auto" }, ytLink("watch?v=" + v.id, v.title), h("small", { dir: "auto" }, v.channel + " · " + tr("yt_views_n", { n: short(v.views) }))),
            h("a", { class: "btn btn-sm", href: toolUrl("tag-extractor", "v", v.id) }, h("span", { text: tr("ytchan_tags_btn") }))));
        });
        fill(kwOut,
          section(tr("ytkw_trend_tags", { n: num(r.count) }),
            names.length ? chips(r.tags.map(function (t) { return h("span", { dir: "auto" }, t.tag, h("b", { class: "yt-n" }, " ×" + num(t.n))); })) : msg(tr("ytchan_tags_none")),
            names.length ? row(copyBtn(tr("yt_copy_comma"), function () { return names.join(", "); })) : null),
          section(tr("ytkw_trend_videos"), vids));
      }, function (e) { fill(kwOut, msg(errorText(e), "bad")); });
    });
  }

  // ---------- Video SEO score ----------
  // Rules of thumb from YouTube's own creator advice: a clear title the right length with the main keyword early,
  // a full description that repeats it, chapters, a few hashtags, captions and engaged viewers. Each check has a
  // weight; the score is the share of points earned.
  var seoOut = document.getElementById("ytseo-out");
  if (seoOut) {
    var seoChecks = function (v, kw) {
      var out = [], title = v.title || "", desc = v.description || "", low = function (s) { return s.toLocaleLowerCase(lang); };
      var add = function (key, weight, level, vars) { out.push({ key: key, weight: weight, level: level, vars: vars }); };
      var tlen = Array.from(title).length;
      add(tlen < 20 ? "ytseo_title_short" : tlen > 70 ? "ytseo_title_long" : "ytseo_title_ok", 10, tlen < 20 || tlen > 70 ? 0.4 : 1, { n: tlen });
      var letters = title.replace(/[^A-Za-z]/g, ""), caps = letters.length > 8 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.6;
      if (caps) add("ytseo_caps", 3, 0);
      if (kw) {
        var k = low(kw), at = low(title).indexOf(k);
        add(at < 0 ? "ytseo_kw_title_no" : at <= tlen * 0.4 ? "ytseo_kw_title_start" : "ytseo_kw_title_late", 15, at < 0 ? 0 : at <= tlen * 0.4 ? 1 : 0.7, { k: kw });
        var inDesc = low(desc.slice(0, 200)).indexOf(k) >= 0;
        add(inDesc ? "ytseo_kw_desc_ok" : "ytseo_kw_desc_no", 10, inDesc ? 1 : 0, { k: kw });
        var inTags = (v.tags || []).some(function (t) { return low(t).indexOf(k) >= 0; });
        add(inTags ? "ytseo_kw_tags_ok" : "ytseo_kw_tags_no", 5, inTags ? 1 : 0, { k: kw });
      }
      var words = desc.split(/\s+/).filter(Boolean).length;
      add(words >= 200 ? "ytseo_desc_ok" : words >= 80 ? "ytseo_desc_mid" : "ytseo_desc_short", 10, words >= 200 ? 1 : words >= 80 ? 0.5 : 0, { n: words });
      var stamps = (desc.match(/(^|\n)\s*\(?\d{1,2}:\d{2}(:\d{2})?\)?\s/g) || []).length;
      var chapters = stamps >= 3 && /(^|\n)\s*\(?0?0:00/.test(desc);
      if (v.duration >= 240) add(chapters ? "ytseo_chapters_ok" : "ytseo_chapters_no", 5, chapters ? 1 : 0);
      var nh = (v.hashtags || []).length;
      add(nh > 15 ? "ytseo_hash_many" : nh === 0 ? "ytseo_hash_none" : "ytseo_hash_ok", 5, nh > 15 ? 0 : nh === 0 ? 0.3 : 1, { n: nh });
      var nt = (v.tags || []).length;
      add(nt === 0 ? "ytseo_tags_none" : nt < 5 ? "ytseo_tags_few" : "ytseo_tags_ok", 5, nt === 0 ? 0.3 : nt < 5 ? 0.7 : 1, { n: nt });
      add(/https?:\/\//.test(desc) ? "ytseo_links_ok" : "ytseo_links_no", 3, /https?:\/\//.test(desc) ? 1 : 0.3);
      add(v.captions ? "ytseo_captions_ok" : "ytseo_captions_no", 7, v.captions ? 1 : 0);
      add(v.language ? "ytseo_lang_ok" : "ytseo_lang_no", 4, v.language ? 1 : 0.3);
      if (v.views >= 100 && v.likes != null) {
        var rate = (v.likes / v.views) * 100;
        add(rate >= 4 ? "ytseo_likes_good" : rate >= 2 ? "ytseo_likes_ok" : "ytseo_likes_low", 10, rate >= 4 ? 1 : rate >= 2 ? 0.7 : 0.3, { n: num(Math.round(rate * 10) / 10) });
      }
      if (v.views >= 100 && v.comments != null) {
        var cr = (v.comments / v.views) * 1000;
        add(cr >= 5 ? "ytseo_comments_good" : cr >= 1 ? "ytseo_comments_ok" : "ytseo_comments_low", 5, cr >= 5 ? 1 : cr >= 1 ? 0.7 : 0.3, { n: num(Math.round(cr * 10) / 10) });
      }
      return out;
    };
    wire("ytseo", "v", function (value) {
      if (!videoId(value)) { fill(seoOut, msg(tr("yt_err_bad_video"), "bad")); return; }
      busy(seoOut);
      var kwBox = document.getElementById("ytseo-kw");
      call("video", { v: value, hl: lang }).then(function (v) {
        var kw = kwBox.value.trim() || (v.tags && v.tags[0]) || "";
        var checks = seoChecks(v, kw), total = 0, got = 0;
        checks.forEach(function (c) { total += c.weight; got += c.weight * c.level; });
        var score = Math.round((got / total) * 100);
        var grade = score >= 85 ? "great" : score >= 70 ? "good" : score >= 50 ? "fair" : "poor";
        var list = h("ul", { class: "findings" });
        checks.slice().sort(function (a, b) { return a.level - b.level || b.weight - a.weight; }).forEach(function (c) {
          list.appendChild(h("li", { class: c.level >= 1 ? "sev-ok" : c.level >= 0.5 ? "sev-low" : "sev-high" }, tr(c.key, c.vars)));
        });
        fill(seoOut,
          videoHead(v),
          h("div", { class: "yt-score yt-score-" + grade },
            h("strong", null, num(score)), h("span", null, h("b", null, tr("ytseo_grade_" + grade)), tr("ytseo_out_of"))),
          kw ? msg(tr(kwBox.value.trim() ? "ytseo_kw_used" : "ytseo_kw_guess", { k: kw })) : msg(tr("ytseo_kw_none")),
          section(tr("ytseo_checks"), list),
          row(h("a", { class: "btn btn-sm", href: toolUrl("tag-extractor", "v", v.id) }, h("span", { text: tr("ytchan_get_tags") })),
              h("a", { class: "btn btn-sm", href: toolUrl("keyword-ideas", "q", kw || v.title) }, h("span", { text: tr("ytseo_more_kw") }))));
      }, function (e) { fill(seoOut, msg(errorText(e), "bad")); });
    });
  }

  // ---------- Outlier finder ----------
  // The latest 100 uploads, each against the channel's median views: 3× or more is an outlier, an idea worth studying.
  var outOut = document.getElementById("ytout-out");
  if (outOut) wire("ytout", "c", function (value) {
    busy(outOut);
    call("outliers", { c: value, hl: lang }).then(function (r) {
      var sortBy = "score", onlyHot = false;
      var listBox = h("div");
      var draw = function () {
        var vids = r.uploads.filter(function (v) { return !onlyHot || v.score >= 3; });
        vids.sort(function (a, b) { return sortBy === "new" ? Date.parse(b.published) - Date.parse(a.published) : (b[sortBy] || 0) - (a[sortBy] || 0); });
        var ol = h("ol", { class: "yt-list yt-out-list" });
        vids.forEach(function (v) {
          var hot = v.score >= 3 ? "hot" : v.score >= 1.5 ? "up" : v.score < 0.5 ? "down" : "mid";
          ol.appendChild(h("li", null,
            h("img", { src: "https://i.ytimg.com/vi/" + v.id + "/mqdefault.jpg", alt: "", width: "96", height: "54", loading: "lazy" }),
            h("span", { dir: "auto" }, ytLink("watch?v=" + v.id, v.title),
              h("small", null, tr("yt_views_n", { n: short(v.views) }) + " · " + tr("ytout_per_day", { n: short(v.perDay) }) + " · " + date(v.published) + (v.duration ? " · " + clock(v.duration) : "") + (v.fresh ? " · " + tr("ytout_fresh") : ""))),
            h("b", { class: "yt-x yt-x-" + hot, title: tr("ytout_x_title") }, v.score == null ? "–" : "×" + num(v.score))));
        });
        fill(listBox, vids.length ? ol : msg(tr("ytout_none")));
      };
      var sel = h("select", { class: "field field-inline", "aria-label": tr("ytout_sort") });
      [["score", "ytout_sort_score"], ["views", "ytout_sort_views"], ["perDay", "ytout_sort_day"], ["new", "ytout_sort_new"]].forEach(function (o) { sel.appendChild(h("option", { value: o[0] }, tr(o[1]))); });
      sel.addEventListener("change", function () { sortBy = sel.value; draw(); });
      var hotBox = h("input", { type: "checkbox" });
      hotBox.addEventListener("change", function () { onlyHot = hotBox.checked; draw(); });
      var hotCount = r.uploads.filter(function (v) { return v.score >= 3; }).length;
      draw();
      fill(outOut,
        h("div", { class: "yt-head yt-chan" },
          r.thumb ? h("img", { class: "yt-avatar", src: r.thumb, alt: "", width: "72", height: "72", loading: "lazy" }) : null,
          h("div", null,
            h("p", { class: "yt-title", dir: "auto" }, ytLink(r.handle || "channel/" + r.id, r.title)),
            h("p", { class: "tool-msg" }, (r.subscribers == null ? tr("yt_subs_hidden") : tr("yt_subs_n", { n: short(r.subscribers) })) + " · " + tr("yt_videos_n", { n: num(r.videos) })))),
        msg(tr("ytout_summary", { n: num(r.sample), m: short(r.medianViews), k: num(hotCount) })),
        h("div", { class: "check-row" }, h("label", { class: "check" }, h("span", { text: tr("ytout_sort") }), sel), h("label", { class: "check" }, hotBox, h("span", { text: " " + tr("ytout_only_hot") }))),
        listBox,
        hotCount ? row(copyBtn(tr("ytout_copy"), function () {
          return r.uploads.filter(function (v) { return v.score >= 3; }).sort(function (a, b) { return b.score - a.score; }).map(function (v) { return "×" + v.score + "  " + v.title; }).join("\n");
        })) : null);
    }, function (e) { fill(outOut, msg(errorText(e), "bad")); });
  });

  // ---------- Channel health report ----------
  // One channel's uploads in a period, scored on five public signals, with what to improve and a PDF to download.
  var PARTS = ["consistency", "reach", "engagement", "momentum", "seo"];
  function scoreClass(n) { return n == null ? "na" : n >= 85 ? "a" : n >= 70 ? "b" : n >= 50 ? "c" : "f"; }
  function ring(score, grade) {
    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 120 120");
    svg.setAttribute("class", "web-ring g-" + scoreClass(score));
    svg.setAttribute("aria-hidden", "true");
    var bg = document.createElementNS(NS, "circle"), fg = document.createElementNS(NS, "circle");
    [bg, fg].forEach(function (c) { c.setAttribute("cx", "60"); c.setAttribute("cy", "60"); c.setAttribute("r", "52"); });
    bg.setAttribute("class", "web-ring-bg");
    fg.setAttribute("class", "web-ring-fg");
    var len = 2 * Math.PI * 52;
    fg.setAttribute("stroke-dasharray", len.toFixed(1));
    fg.setAttribute("stroke-dashoffset", (len * (1 - (score || 0) / 100)).toFixed(1));
    svg.appendChild(bg); svg.appendChild(fg);
    return h("div", { class: "web-ring-wrap" }, svg,
      h("div", { class: "web-ring-text" }, h("strong", null, score == null ? "–" : num(score)), h("span", null, "/100")),
      h("span", { class: "web-grade g-" + scoreClass(score), "aria-label": tr("ytrep_grade") + " " + (grade || "–") }, grade || "–"));
  }
  // A list of labelled bars. Widths are set through el.style: the site's security policy blocks style="" attributes.
  function bars(items) {
    var ul = h("ul", { class: "web-bars" });
    items.forEach(function (it) {
      var i = h("i", { class: it.cls || "" });
      i.style.width = Math.max(0, Math.min(100, it.pct || 0)) + "%";
      ul.appendChild(h("li", { title: it.title || null }, h("span", { dir: "auto" }, it.label), h("span", { class: "web-bar", "aria-hidden": "true" }, i), h("b", { class: it.cls || null }, it.value)));
    });
    return ul;
  }
  function scoreBars(r) {
    return bars(PARTS.map(function (k) {
      var s = r.scores[k];
      return { label: tr("ytrep_part_" + k), pct: s, value: s == null ? "–" : num(s), cls: "g-" + scoreClass(s), title: tr("ytrep_part_" + k + "_why") };
    }));
  }
  var SEV = { high: "sev-high", medium: "sev-med", low: "sev-low", good: "sev-ok" };
  function tipText(t) {
    var n = t.n == null ? "" : typeof t.n === "number" ? num(t.n) : t.n;
    return tr("ytrep_tip_" + t.code, { n: n });
  }
  function tipList(tips) {
    var ul = h("ul", { class: "findings" });
    tips.forEach(function (t) { ul.appendChild(h("li", { class: SEV[t.sev] || "sev-info" }, t.text || tipText(t))); });
    return ul;
  }
  function periodText(r) {
    return r.period === "all" ? tr("ytrep_p_all") : tr("ytrep_p_" + r.period);
  }
  // The period as it reads inside a sentence ("the last 90 days").
  function periodIn(r) { return tr("ytrep_in_" + r.period); }
  function basedOn(r) {
    return tr(r.period === "all" ? "ytrep_based_all" : "ytrep_based", { n: num(r.sample), p: periodIn(r) }) + (r.capped ? " " + tr("ytrep_capped", { n: num(r.sample) }) : "");
  }
  // Views of each upload in the period, oldest on the left, with the channel's median as a dashed line.
  function viewsChart(r) {
    var vids = r.uploads.slice().reverse();
    if (vids.length < 2) return null;
    var NS = "http://www.w3.org/2000/svg", W = 720, H = 200, pad = 4;
    var max = Math.max.apply(null, vids.map(function (v) { return v.views || 0; })) || 1;
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + (H + 2));
    svg.setAttribute("class", "yt-chart");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", tr("ytrep_chart_views"));
    var step = W / vids.length, bw = Math.max(1, Math.min(28, step - 2));
    vids.forEach(function (v, i) {
      var bh = Math.max(2, ((v.views || 0) / max) * (H - pad));
      var g = document.createElementNS(NS, "g");
      var hit = document.createElementNS(NS, "rect");
      hit.setAttribute("x", (i * step).toFixed(1)); hit.setAttribute("y", "0"); hit.setAttribute("width", step.toFixed(1)); hit.setAttribute("height", H);
      hit.setAttribute("class", "yt-chart-hit");
      var b = document.createElementNS(NS, "rect");
      b.setAttribute("x", (i * step + (step - bw) / 2).toFixed(1)); b.setAttribute("y", (H - bh).toFixed(1));
      b.setAttribute("width", bw.toFixed(1)); b.setAttribute("height", bh.toFixed(1)); b.setAttribute("rx", Math.min(4, bw / 2));
      b.setAttribute("class", "yt-chart-bar" + (v.score >= 3 ? " is-hot" : ""));
      var t = document.createElementNS(NS, "title");
      t.textContent = v.title + " · " + tr("yt_views_n", { n: short(v.views) }) + " · " + date(v.published) + (v.score != null ? " · ×" + num(v.score) : "");
      g.appendChild(t); g.appendChild(hit); g.appendChild(b);
      svg.appendChild(g);
    });
    if (r.medianViews) {
      var y = (H - (r.medianViews / max) * (H - pad)).toFixed(1);
      var line = document.createElementNS(NS, "line");
      line.setAttribute("x1", "0"); line.setAttribute("x2", W); line.setAttribute("y1", y); line.setAttribute("y2", y);
      line.setAttribute("class", "yt-chart-median");
      svg.appendChild(line);
    }
    var base = document.createElementNS(NS, "line");
    base.setAttribute("x1", "0"); base.setAttribute("x2", W); base.setAttribute("y1", H + 1); base.setAttribute("y2", H + 1);
    base.setAttribute("class", "yt-chart-base");
    svg.appendChild(base);
    return h("figure", { class: "yt-fig" }, svg,
      h("figcaption", null,
        h("span", null, date(vids[0].published)),
        h("span", null, h("i", { class: "yt-key yt-key-median" }), tr("ytrep_median_line", { n: short(r.medianViews) }), "  ", h("i", { class: "yt-key yt-key-hot" }), tr("ytrep_hot_bars")),
        h("span", null, date(vids[vids.length - 1].published))));
  }
  // Median views by the weekday a video went out, in the visitor's own time zone.
  function weekdays(r) {
    var by = [[], [], [], [], [], [], []];
    r.uploads.forEach(function (v) { if (v.published) by[new Date(v.published).getDay()].push(v.views || 0); });
    var med = function (a) { a = a.slice().sort(function (x, y) { return x - y; }); var m = Math.floor(a.length / 2); return a.length ? (a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2) : null; };
    var fmt = new Intl.DateTimeFormat(lang, { weekday: "long" });
    var rows = [1, 2, 3, 4, 5, 6, 0].map(function (d) { return { d: d, n: by[d].length, m: med(by[d]), name: fmt.format(new Date(2024, 0, 1 + ((d + 6) % 7))) }; });
    var max = Math.max.apply(null, rows.map(function (x) { return x.m || 0; })) || 1;
    var best = rows.filter(function (x) { return x.n >= 2; }).sort(function (a, b) { return b.m - a.m; })[0];
    return {
      best: best,
      el: bars(rows.map(function (x) {
        return { label: x.name, pct: ((x.m || 0) / max) * 100, value: x.n ? short(x.m) : "–", cls: best && x.d === best.d ? "g-a" : "", title: tr("ytrep_day_n", { n: num(x.n) }) };
      })),
    };
  }
  function videoList(list) {
    var ol = h("ol", { class: "yt-list yt-out-list" });
    list.forEach(function (v) {
      var hot = v.score >= 3 ? "hot" : v.score >= 1.5 ? "up" : v.score < 0.5 ? "down" : "mid";
      ol.appendChild(h("li", null,
        h("img", { src: "https://i.ytimg.com/vi/" + v.id + "/mqdefault.jpg", alt: "", width: "96", height: "54", loading: "lazy" }),
        h("span", { dir: "auto" }, ytLink("watch?v=" + v.id, v.title),
          h("small", null, tr("yt_views_n", { n: short(v.views) }) + " · " + date(v.published) + (v.duration ? " · " + clock(v.duration) : ""))),
        h("b", { class: "yt-x yt-x-" + hot, title: tr("ytout_x_title") }, v.score == null ? "–" : "×" + num(v.score))));
    });
    return ol;
  }
  function pct(n) { return n == null ? null : num(n) + "%"; }
  function settled(r) { var week = Date.now() - 7 * 86400000; return r.uploads.filter(function (v) { return Date.parse(v.published) < week; }); }
  function channelHeadEl(r) {
    return h("div", { class: "yt-head yt-chan" },
      r.thumb ? h("img", { class: "yt-avatar", src: r.thumb, alt: "", width: "72", height: "72", loading: "lazy" }) : null,
      h("div", null,
        h("p", { class: "yt-title", dir: "auto" }, ytLink(r.handle || "channel/" + r.id, r.title)),
        h("p", { class: "tool-msg" }, (r.subscribers == null ? tr("yt_subs_hidden") : tr("yt_subs_n", { n: short(r.subscribers) })) + " · " + tr("yt_videos_n", { n: num(r.videos) }))));
  }
  function numbers(r) {
    return [
      [tr("ytrep_uploads"), num(r.sample)],
      [tr("ytrep_upload_views"), num(r.totals.views)],
      [tr("ytvs_median_p"), num(r.medianViews)],
      [tr("ytrep_avg"), num(r.avgViews)],
      [tr("ytvs_reach"), pct(r.reach)],
      [tr("ytvs_engagement"), pct(r.engagement)],
      [tr("ytchan_per_week"), r.perWeek == null ? null : num(r.perWeek)],
      [tr("ytrep_since_last"), r.sinceLast == null ? null : tr("ytrep_days", { n: num(r.sinceLast) })],
      [tr("ytrep_longest_gap"), r.longestGap == null ? null : tr("ytrep_days", { n: num(r.longestGap) })],
      [tr("ytrep_momentum"), r.momentum.change == null ? null : tr("ytrep_momentum_v", { a: short(r.momentum.recent), b: short(r.momentum.earlier) })],
      [tr("ytrep_shorts"), r.formats.shorts ? tr("ytrep_format_v", { n: num(r.formats.shorts), m: short(r.formats.shortsMedian) }) : "0"],
      [tr("ytrep_long"), r.formats.long ? tr("ytrep_format_v", { n: num(r.formats.long), m: short(r.formats.longMedian) }) : "0"],
      [tr("ytchan_created"), date(r.created)],
    ];
  }
  function seoFacts(r) {
    return ["tags", "titles", "descriptions", "chapters", "hashtags", "links", "captions", "language"].map(function (k) { return [tr("ytrep_seo_" + k), pct(r.seo[k])]; })
      .concat([[tr("ytrep_seo_keywords"), r.keywords ? num(r.keywords) : tr("yt_no")]]);
  }

  // The PDF is drawn by yt-report-pdf.js, loaded with jsPDF and html2canvas-pro only when someone asks for it.
  var SELF = document.currentScript && document.currentScript.src || "/assets/js/youtube.js";
  var JS_DIR = SELF.replace(/[?#].*$/, "").replace(/[^/]*$/, "");
  var VERSION = (SELF.match(/\?v=\w+/) || [""])[0];
  var PDF_LIBS = [JS_DIR + "../lib/jspdf-4.2.1.min.js", JS_DIR + "../lib/html2canvas-pro-2.5.2.min.js", JS_DIR + "yt-report-pdf.js" + VERSION];
  var pdfLoading = null;
  function loadScript(src) {
    return new Promise(function (ok, fail) {
      var s = h("script", { src: src });
      s.onload = ok; s.onerror = function () { fail(new Error("load " + src)); };
      document.head.appendChild(s);
    });
  }
  function pdfBtn(kind, data) {
    var b = h("button", { class: "btn btn-primary btn-sm", type: "button" }, h("span", { text: tr("ytrep_pdf") }));
    b.addEventListener("click", function () {
      if (b.disabled) return;
      var label = b.querySelector("span");
      b.disabled = true; label.textContent = tr("ytrep_pdf_making");
      if (!pdfLoading) pdfLoading = PDF_LIBS.reduce(function (p, src) { return p.then(function () { return loadScript(src); }); }, Promise.resolve());
      pdfLoading.then(function () {
        return window.ytReportPdf(kind, data, {
          tr: tr, h: h, num: num, short: short, date: date, clock: clock, rtl: rtl, lang: lang, ring: ring, bars: bars, scoreBars: scoreBars,
          tipList: tipList, periodText: periodText, periodIn: periodIn, basedOn: basedOn, numbers: numbers, seoFacts: seoFacts, weekdays: weekdays, settled: settled, facts: facts,
          catchUp: catchUp, tagGaps: tagGaps, vsVerdict: vsVerdict, vsRows: vsRows,
          PARTS: PARTS, scoreClass: scoreClass, brand: document.title.split(" | ").pop(),
          url: location.href,
        });
      }).catch(function (e) {
        pdfLoading = null;
        if (window.console) console.error(e);
        alert(tr("ytrep_pdf_fail"));
      }).then(function () { b.disabled = false; label.textContent = tr("ytrep_pdf"); });
    });
    return b;
  }

  function periodPicker(id) {
    var sel = document.getElementById(id + "-p");
    if (!sel) return { get: function () { return "90"; } };
    var start = new URLSearchParams(location.search).get("p");
    if (start && [].some.call(sel.options, function (o) { return o.value === start; })) sel.value = start;
    return {
      el: sel,
      get: function () {
        var u = new URL(location.href);
        u.searchParams.set("p", sel.value);
        history.replaceState(null, "", u);
        return sel.value;
      },
    };
  }

  var repOut = document.getElementById("ytrep-out");
  if (repOut) {
    var repPeriod = periodPicker("ytrep");
    var runReport = function (value) {
      busy(repOut);
      call("report", { c: value, p: repPeriod.get(), hl: lang }).then(function (r) {
        var best = settled(r).slice().sort(function (a, b) { return (b.views || 0) - (a.views || 0); });
        var day = weekdays(r);
        fill(repOut,
          channelHeadEl(r),
          h("div", { class: "web-summary-main yt-rep-sum" }, ring(r.overall, r.grade),
            h("div", { class: "web-summary-text" },
              h("h2", null, tr("ytrep_sum_" + (r.grade || "na"))),
              h("p", { class: "muted" }, basedOn(r)))),
          section(tr("ytrep_parts"), scoreBars(r)),
          section(tr("ytrep_tips"), r.tips.length ? tipList(r.tips) : msg(tr("ytrep_tips_none"))),
          section(tr("ytrep_numbers", { p: periodIn(r) }), facts(numbers(r))),
          r.uploads.length > 1 ? section(tr("ytrep_chart_views"), viewsChart(r)) : null,
          r.uploads.length >= 4 ? section(tr("ytrep_days_title"), day.best ? msg(tr("ytrep_best_day", { d: day.best.name })) : null, day.el) : null,
          best.length ? section(tr("ytrep_best"), videoList(best.slice(0, 5))) : null,
          best.length >= 8 ? section(tr("ytrep_worst"), videoList(best.slice(-5).reverse())) : null,
          section(tr("ytrep_seo"), facts(seoFacts(r))),
          row(pdfBtn("health", r),
              h("a", { class: "btn btn-sm", href: toolUrl("outlier-finder", "c", r.id) }, h("span", { text: tr("ytout_title") })),
              h("a", { class: "btn btn-sm", href: toolUrl("channel-comparison", "a", r.handle || r.id) }, h("span", { text: tr("ytrep_to_compare") })),
              h("a", { class: "btn btn-sm", href: toolUrl("channel-keywords", "c", r.id) }, h("span", { text: tr("ytrep_to_keywords") }))));
      }, function (e) { fill(repOut, msg(errorText(e), "bad")); });
    };
    wire("ytrep", "c", runReport);
    if (repPeriod.el) repPeriod.el.addEventListener("change", function () {
      var v = document.getElementById("ytrep-input").value.trim();
      if (v) runReport(v);
    });
  }

  // ---------- Channel vs channel ----------
  // Both channels' health reports for the same period, side by side, and what the channel behind should do to catch up.
  function catchUp(lead, back) {
    var tips = [], keep = [];
    var L = lead.title, B = back.title;
    var gap = function (k) { return (lead.scores[k] || 0) - (back.scores[k] || 0); };
    if (gap("consistency") >= 10 && lead.perWeek != null) tips.push({ sev: "high", text: tr("ytvs_do_consistency", { name: L, a: num(lead.perWeek), b: num(back.perWeek || 0) }) });
    if (gap("reach") >= 10 && lead.reach != null) tips.push({ sev: "high", text: tr("ytvs_do_reach", { name: L, a: num(lead.reach), b: num(back.reach || 0) }) });
    if (gap("engagement") >= 10 && lead.engagement != null) tips.push({ sev: "medium", text: tr("ytvs_do_engagement", { name: L, a: num(lead.engagement), b: num(back.engagement || 0) }) });
    if (gap("momentum") >= 10 && back.momentum.change != null && back.momentum.change < 1) tips.push({ sev: "medium", text: tr("ytvs_do_momentum", { n: num(Math.round((1 - back.momentum.change) * 100)) }) });
    ["chapters", "captions", "descriptions", "tags", "hashtags"].forEach(function (k) {
      if (lead.seo[k] != null && (lead.seo[k] - (back.seo[k] || 0)) >= 25) tips.push({ sev: "low", text: tr("ytvs_do_seo_" + k, { name: L, a: num(lead.seo[k]), b: num(back.seo[k] || 0) }) });
    });
    var share = function (r) { return r.sample ? r.formats.shorts / r.sample : 0; };
    if (lead.formats.shortsMedian && lead.formats.longMedian && share(lead) - share(back) >= 0.3) tips.push({ sev: "medium", text: tr("ytvs_do_shorts", { name: L, a: num(Math.round(share(lead) * 100)), b: num(Math.round(share(back) * 100)) }) });
    if (share(back) - share(lead) >= 0.3) tips.push({ sev: "medium", text: tr("ytvs_do_long", { name: L, a: num(Math.round((1 - share(lead)) * 100)), b: num(Math.round((1 - share(back)) * 100)) }) });
    if (!back.keywords && lead.keywords) tips.push({ sev: "low", text: tr("ytrep_tip_channel_keywords") });
    PARTS.forEach(function (k) { if (gap(k) <= -10) keep.push({ sev: "good", text: tr("ytvs_keep_" + k, { name: B }) }); });
    return { tips: tips, keep: keep };
  }
  function tagGaps(A, B) {
    var names = function (c) { return (c.tags || []).map(function (t) { return t.tag; }); };
    var setB = {}; names(B).forEach(function (t) { setB[t.toLowerCase()] = 1; });
    var setA = {}; names(A).forEach(function (t) { setA[t.toLowerCase()] = 1; });
    return {
      shared: names(A).filter(function (t) { return setB[t.toLowerCase()]; }),
      onlyA: names(A).filter(function (t) { return !setB[t.toLowerCase()]; }).slice(0, 20),
      onlyB: names(B).filter(function (t) { return !setA[t.toLowerCase()]; }).slice(0, 20),
    };
  }
  function vsRows(A, B) {
    var per = function (c) { return c.videos ? Math.round(c.views / c.videos) : null; };
    var last = function (c) { return c.sinceLast == null ? null : new Date(Date.now() - c.sinceLast * 86400000).toISOString(); };
    var p = function (n) { return num(n) + "%"; };
    return [
      ["ytrep_overall", A.overall, B.overall, num],
      ["yt_subscribers", A.subscribers, B.subscribers, short],
      ["ytchan_total_views", A.views, B.views, short],
      ["ytchan_videos", A.videos, B.videos, num],
      ["ytvs_per_video", per(A), per(B), short],
      ["ytrep_uploads", A.sample, B.sample, num],
      ["ytvs_median_p", A.medianViews, B.medianViews, short],
      ["ytvs_reach", A.reach, B.reach, p],
      ["ytvs_engagement", A.engagement, B.engagement, p],
      ["ytchan_per_week", A.perWeek, B.perWeek, num],
      ["ytchan_created", A.created, B.created, date, "older"],
      ["ytchan_last", last(A), last(B), date, "newer"],
    ];
  }
  function vsTable(A, B) {
    var table = h("table", { class: "yt-vs" });
    table.appendChild(h("thead", null, h("tr", null, h("th", { scope: "col" }, ""), h("th", { scope: "col", dir: "auto" }, A.title), h("th", { scope: "col", dir: "auto" }, B.title))));
    var body = h("tbody");
    var addRow = function (label, a, b, f, kind) {
      var win = -1;
      if (a != null && b != null && a !== b) {
        if (kind === "older") win = Date.parse(a) < Date.parse(b) ? 0 : 1;
        else if (kind === "newer") win = Date.parse(a) > Date.parse(b) ? 0 : 1;
        else win = a > b ? 0 : 1;
      }
      body.appendChild(h("tr", null, h("th", { scope: "row" }, label),
        h("td", { class: win === 0 ? "is-win" : null }, a == null ? tr("yt_hidden") : f(a)),
        h("td", { class: win === 1 ? "is-win" : null }, b == null ? tr("yt_hidden") : f(b))));
    };
    vsRows(A, B).forEach(function (x) { addRow(tr(x[0]), x[1], x[2], x[3], x[4]); });
    PARTS.forEach(function (k) { addRow(tr("ytrep_part_" + k), A.scores[k], B.scores[k], num); });
    table.appendChild(body);
    return h("div", { class: "yt-vs-wrap" }, table);
  }
  function vsVerdict(A, B) {
    if (A.overall == null || B.overall == null || A.overall === B.overall) return { lead: null, back: null, text: tr("ytvs_tie_score") };
    var lead = A.overall > B.overall ? A : B, back = lead === A ? B : A;
    return { lead: lead, back: back, text: tr("ytvs_lead_score", { name: lead.title, a: num(lead.overall), other: back.title, b: num(back.overall) }) };
  }

  var vsOut = document.getElementById("ytvs-out");
  if (vsOut) {
    var vsForm = document.getElementById("ytvs-form"), inA = document.getElementById("ytvs-a"), inB = document.getElementById("ytvs-b");
    var vsPeriod = periodPicker("ytvs");
    var compare = function (a, b) {
      busy(vsOut);
      var p = vsPeriod.get();
      Promise.all([call("report", { c: a, p: p, hl: lang }), call("report", { c: b, p: p, hl: lang })]).then(function (r) {
        var A = r[0], B = r[1];
        var v = vsVerdict(A, B), g = tagGaps(A, B);
        var plan = v.back ? catchUp(v.lead, v.back) : null;
        fill(vsOut,
          h("div", { class: "yt-vs-rings" },
            h("div", null, ring(A.overall, A.grade), h("p", { class: "yt-title", dir: "auto" }, ytLink(A.handle || "channel/" + A.id, A.title))),
            h("div", null, ring(B.overall, B.grade), h("p", { class: "yt-title", dir: "auto" }, ytLink(B.handle || "channel/" + B.id, B.title)))),
          msg(v.text + " " + tr("ytvs_period", { p: periodIn(A) })),
          vsTable(A, B),
          plan ? section(tr("ytvs_plan", { name: v.back.title }), plan.tips.length ? tipList(plan.tips) : msg(tr("ytvs_plan_none")),
            g && v.back === A && g.onlyB.length ? msg(tr("ytvs_do_topics", { name: v.lead.title, t: g.onlyB.slice(0, 8).join(", ") })) : null,
            g && v.back === B && g.onlyA.length ? msg(tr("ytvs_do_topics", { name: v.lead.title, t: g.onlyA.slice(0, 8).join(", ") })) : null) : null,
          plan && plan.keep.length ? section(tr("ytvs_keep", { name: v.back.title }), tipList(plan.keep)) : null,
          section(tr("ytvs_shared", { n: num(g.shared.length) }), g.shared.length ? chips(g.shared) : msg(tr("ytvs_shared_none")), g.shared.length ? row(copyBtn(tr("yt_copy_comma"), function () { return g.shared.join(", "); })) : null),
          g.onlyA.length ? section(tr("ytvs_only", { name: A.title }), chips(g.onlyA)) : null,
          g.onlyB.length ? section(tr("ytvs_only", { name: B.title }), chips(g.onlyB)) : null,
          row(pdfBtn("compare", { A: A, B: B }),
              h("a", { class: "btn btn-sm", href: toolUrl("channel-health-report", "c", A.handle || A.id) + "&p=" + p }, h("span", { text: tr("ytvs_report_of", { name: A.title }) })),
              h("a", { class: "btn btn-sm", href: toolUrl("channel-health-report", "c", B.handle || B.id) + "&p=" + p }, h("span", { text: tr("ytvs_report_of", { name: B.title }) })),
              h("a", { class: "btn btn-sm", href: toolUrl("outlier-finder", "c", A.id) }, h("span", { text: tr("ytvs_outliers", { name: A.title }) })),
              h("a", { class: "btn btn-sm", href: toolUrl("outlier-finder", "c", B.id) }, h("span", { text: tr("ytvs_outliers", { name: B.title }) }))));
      }, function (e) { fill(vsOut, msg(errorText(e), "bad")); });
    };
    vsForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var a = inA.value.trim(), b = inB.value.trim();
      if (!a) { inA.focus(); return; }
      if (!b) { inB.focus(); return; }
      var u = new URL(location.href);
      u.searchParams.set("a", a); u.searchParams.set("b", b);
      history.replaceState(null, "", u);
      compare(a, b);
    });
    var sp = new URLSearchParams(location.search);
    if (sp.get("a") && sp.get("b")) { inA.value = sp.get("a"); inB.value = sp.get("b"); compare(sp.get("a"), sp.get("b")); }
    else if (sp.get("a")) inA.value = sp.get("a");
  }

  // ---------- Thumbnail downloader ----------
  // The pictures are shown straight from YouTube's image server; "Download" goes through the Worker, which adds the
  // header that makes the browser save the file instead of opening it.
  var thumbOut = document.getElementById("ytthumb-out");
  if (thumbOut) wire("ytthumb", "v", function (value) {
    var id = videoId(value);
    if (!id) { fill(thumbOut, msg(tr("yt_err_bad_video"), "bad")); return; }
    var sizes = [["maxres", "maxresdefault", "1280 × 720"], ["sd", "sddefault", "640 × 480"], ["hq", "hqdefault", "480 × 360"], ["mq", "mqdefault", "320 × 180"], ["default", "default", "120 × 90"]];
    var grid = h("div", { class: "yt-thumbs" });
    sizes.forEach(function (s) {
      var src = "https://i.ytimg.com/vi/" + id + "/" + s[1] + ".jpg";
      var img = h("img", { src: src, alt: tr("ytthumb_alt", { size: s[2] }), loading: "lazy" });
      var card = h("figure", { class: "yt-thumb-card" },
        img,
        h("figcaption", null,
          h("strong", null, tr("ytthumb_" + s[0])), h("span", { dir: "ltr" }, s[2]),
          h("span", { class: "btn-row" },
            h("a", { class: "btn btn-primary btn-sm", href: API + "/yt/thumb?v=" + id + "&q=" + s[0], download: id + "-" + s[0] + ".jpg" }, h("span", { text: tr("ytthumb_download") })),
            h("a", { class: "btn btn-sm", href: src, target: "_blank", rel: "noopener" }, h("span", { text: tr("ytthumb_open") })))));
      // A size YouTube didn't make comes back as a 120 × 90 grey placeholder.
      img.addEventListener("load", function () { if (s[0] !== "default" && img.naturalWidth <= 120) { card.classList.add("is-missing"); card.querySelector("figcaption .btn-row").replaceWith(msg(tr("ytthumb_missing"))); } });
      grid.appendChild(card);
    });
    fill(thumbOut, grid,
      row(h("a", { class: "btn btn-sm", href: toolUrl("tag-extractor", "v", id) }, h("span", { text: tr("ytthumb_to_tags") }))));
  });
})();
