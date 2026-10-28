// The YouTube creator tools (/tools/youtube/): tag extractor, transcript extractor, channel details, keyword ideas and
// thumbnail downloader. The page asks the site's Worker (worker/src/yt.js), which uses the official YouTube Data API
// with a key kept on the server. Like tools.js, results are built with DOM nodes, never innerHTML, so a video title
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
  function call(route, params) {
    var q = new URLSearchParams(params).toString();
    return fetch(API + "/yt/" + route + "?" + q).then(function (r) {
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
        c.description ? h("details", { class: "yt-desc" }, h("summary", null, tr("ytchan_about")), h("p", { dir: "auto" }, c.description)) : null);
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
