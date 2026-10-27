// Site behaviour: theme toggle, language switch, mobile menu, scroll effects, the hero network animation,
// project filter, skills chart, BibTeX copy, certificate lightbox and the contact form.
// Plain JavaScript, no libraries. Anything that moves is skipped when the visitor prefers reduced motion.
(function () {
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var onThemeChange = [];

  // Theme toggle: remembers the visitor's choice.
  var themeBtn = document.querySelector(".theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var current = root.getAttribute("data-theme") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      var next = current === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      onThemeChange.forEach(function (fn) { fn(); });
    });
  }

  // Language switch (English / Urdu). Elements with data-i18n get their Urdu text from the JSON block
  // at the end of the page (built from _data/ur.yml); the English text is kept so we can switch back.
  var dict = {};
  try { dict = JSON.parse(document.getElementById("i18n-ur").textContent) || {}; } catch (e) {}
  var langBtn = document.querySelector(".lang-toggle");
  var urNotice = document.querySelector(".ur-notice");
  function setLang(lang, save) {
    var ur = lang === "ur";
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      if (!el.hasAttribute("data-en")) el.setAttribute("data-en", el.textContent);
      var text = ur ? dict[el.getAttribute("data-i18n")] : null;
      el.textContent = text || el.getAttribute("data-en");
      if (ur && text) el.setAttribute("lang", "ur"); else el.removeAttribute("lang");
    });
    root.setAttribute("lang", ur ? "ur" : "en");
    root.setAttribute("dir", ur ? "rtl" : "ltr");
    if (urNotice) urNotice.hidden = !ur;
    if (langBtn) {
      langBtn.setAttribute("lang", ur ? "en" : "ur");
      langBtn.setAttribute("aria-label", ur ? "Read in English" : langBtn.getAttribute("data-label-en"));
    }
    if (save) try { localStorage.setItem("lang", lang); } catch (e) {}
  }
  if (root.getAttribute("lang") === "ur") setLang("ur");
  if (langBtn) langBtn.addEventListener("click", function () {
    setLang(root.getAttribute("lang") === "ur" ? "en" : "ur", true);
  });
  function t(key, fallback) { return root.getAttribute("lang") === "ur" && dict[key] ? dict[key] : fallback; }

  // Mobile menu.
  var nav = document.getElementById("site-nav");
  var menuBtn = document.querySelector(".menu-toggle");
  function setMenu(open) {
    if (!nav || !menuBtn) return;
    nav.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  if (nav && menuBtn) {
    menuBtn.addEventListener("click", function () { setMenu(!nav.classList.contains("is-open")); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); menuBtn.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (nav.classList.contains("is-open") && !e.target.closest(".site-header")) setMenu(false);
    });
    window.matchMedia("(min-width: 861px)").addEventListener("change", function () { setMenu(false); });
  }

  // Header shadow, reading-progress bar and back-to-top button, updated once per frame at most.
  var header = document.querySelector(".site-header");
  var progress = document.querySelector(".scroll-progress");
  var toTop = document.querySelector(".to-top");
  var ticking = false;
  function onScroll() {
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    if (progress) progress.style.transform = "scaleX(" + (max > 0 ? Math.min(y / max, 1) : 0) + ")";
    if (toTop) toTop.classList.toggle("is-visible", y > window.innerHeight * 0.9);
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  var hasIO = "IntersectionObserver" in window;

  // Highlight the menu link of the section on screen.
  if (nav && hasIO) {
    var links = {};
    nav.querySelectorAll('a[href*="#"]').forEach(function (a) {
      var id = a.getAttribute("href").split("#")[1];
      if (document.getElementById(id)) links[id] = a;
    });
    // Sections without their own menu link light up the nearest one.
    var alias = { news: null, focus: null, service: "experience", certifications: "skills", education: "experience", notes: null };
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
        if (id in alias) id = alias[id];
        Object.keys(links).forEach(function (k) { links[k].classList.toggle("is-active", k === id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach(function (s) { spy.observe(s); });
  }

  // Count the hero numbers up from zero ("3.66 / 4.00", "2+ years").
  function countUp(el) {
    var m = /^(\d+(?:\.\d+)?)(.*)$/.exec(el.getAttribute("data-count"));
    if (!m) return;
    var target = parseFloat(m[1]);
    var decimals = (m[1].split(".")[1] || "").length;
    var start = null;
    function step(t) {
      if (start === null) start = t;
      var p = Math.min((t - start) / 1200, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals) + m[2];
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // Fade sections in as they scroll into view; siblings follow one another slightly.
  var reveals = document.querySelectorAll(".reveal");
  if (reduceMotion || !hasIO) {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
    document.querySelectorAll(".ring").forEach(function (r) { r.classList.add("is-drawn"); });
  } else {
    reveals.forEach(function (el) {
      var i = 0, s = el;
      while ((s = s.previousElementSibling)) if (s.classList.contains("reveal")) i++;
      if (i) el.style.setProperty("--d", Math.min(i, 5) * 0.08 + "s");
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        el.classList.add("is-in");
        var n = el.querySelector("[data-count]");
        if (n) countUp(n);
        if (el.classList.contains("ring")) el.classList.add("is-drawn");
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
    document.querySelectorAll(".ring").forEach(function (r) { io.observe(r); });
  }

  // Cards follow the pointer with a soft glow.
  if (window.matchMedia("(hover: hover)").matches) {
    document.querySelectorAll(".spot").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", e.clientX - r.left + "px");
        card.style.setProperty("--my", e.clientY - r.top + "px");
      });
    });
  }

  // Terminal: type each command, then show its output. Hidden text keeps its space, so nothing below jumps.
  var term = document.querySelector(".term-body");
  if (term && !reduceMotion) {
    var lines = Array.prototype.slice.call(term.children);
    lines.forEach(function (l) { l.classList.add("pending"); });
    term.classList.add("typing");
    var li = 0;
    function nextLine() {
      if (li >= lines.length) { term.classList.remove("typing"); return; }
      var line = lines[li++];
      if (!line.classList.contains("cmd") || line.classList.contains("cursor-line")) {
        line.classList.remove("pending");
        setTimeout(nextLine, 260);
        return;
      }
      var full = line.textContent, c = 0;
      var typed = document.createElement("span"), rest = document.createElement("span");
      typed.className = "typing-caret"; rest.className = "rest";
      line.textContent = "";
      line.appendChild(typed); line.appendChild(rest);
      line.classList.remove("pending");
      (function type() {
        typed.textContent = full.slice(0, ++c);
        rest.textContent = full.slice(c);
        if (c < full.length) setTimeout(type, 38 + Math.random() * 40);
        else { line.textContent = full; setTimeout(nextLine, 220); }
      })();
    }
    setTimeout(nextLine, 500);
  }

  // Hero: a slowly drifting network. Packets travel along the links; now and then a node turns
  // orange (a threat) and a teal ring closes in on it (detected). It pauses when off screen.
  var canvas = document.querySelector(".hero-canvas");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, dpr = 1, nodes = [], packets = [], threats = [], colors = {};
    var pointer = null, running = false, last = 0, nextPacket = 0, nextThreat = 1500;
    var linkDist = 140;

    function readColors() {
      var cs = getComputedStyle(root);
      colors.accent = cs.getPropertyValue("--accent").trim() || "#0b5f6b";
      colors.accent2 = cs.getPropertyValue("--accent-2").trim() || "#4b49b8";
      colors.threat = cs.getPropertyValue("--threat").trim() || "#c2410c";
      if (!running) draw(0);
    }
    function rgba(hex, a) {
      var h = hex.replace("#", "");
      if (h.length === 3) h = h.replace(/./g, "$&$&");
      var n = parseInt(h, 16);
      return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
    }
    function resize() {
      var r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      linkDist = W < 640 ? 110 : 140;
      var count = Math.max(22, Math.min(72, Math.round(W * H / 15000)));
      while (nodes.length < count) nodes.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
        r: 1.3 + Math.random() * 1.6, hub: Math.random() < 0.12
      });
      nodes.length = count;
      nodes.forEach(function (n) { n.x = Math.min(n.x, W); n.y = Math.min(n.y, H); });
      if (!running) draw(0);
    }
    function neighbours(i) {
      var a = nodes[i], out = [];
      for (var j = 0; j < nodes.length; j++) {
        if (j === i) continue;
        var dx = a.x - nodes[j].x, dy = a.y - nodes[j].y;
        if (dx * dx + dy * dy < linkDist * linkDist) out.push(j);
      }
      return out;
    }
    function draw(dt) {
      ctx.clearRect(0, 0, W, H);
      var i, j, a, b, dx, dy, d;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        if (dt) {
          a.x += a.vx * dt / 16; a.y += a.vy * dt / 16;
          if (a.x < 0 || a.x > W) a.vx *= -1;
          if (a.y < 0 || a.y > H) a.vy *= -1;
        }
      }
      ctx.lineWidth = 1;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j]; dx = a.x - b.x; dy = a.y - b.y; d = dx * dx + dy * dy;
          if (d < linkDist * linkDist) {
            ctx.strokeStyle = rgba(colors.accent, 0.3 * (1 - Math.sqrt(d) / linkDist));
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        if (pointer) {
          dx = a.x - pointer.x; dy = a.y - pointer.y; d = Math.sqrt(dx * dx + dy * dy);
          if (d < 170) {
            ctx.strokeStyle = rgba(colors.accent2, 0.35 * (1 - d / 170));
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
          }
        }
      }
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        ctx.fillStyle = rgba(a.hub ? colors.accent2 : colors.accent, a.hub ? 0.75 : 0.55);
        ctx.beginPath(); ctx.arc(a.x, a.y, a.hub ? a.r + 1.2 : a.r, 0, Math.PI * 2); ctx.fill();
      }
      // Packets
      for (i = packets.length - 1; i >= 0; i--) {
        var p = packets[i];
        p.t += dt / p.dur;
        if (p.t >= 1) { packets.splice(i, 1); continue; }
        a = nodes[p.from]; b = nodes[p.to];
        var x = a.x + (b.x - a.x) * p.t, y = a.y + (b.y - a.y) * p.t;
        ctx.fillStyle = rgba(colors.accent, 0.9);
        ctx.shadowColor = colors.accent; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      // Threats: orange pulse, then a teal ring closes in and the node turns safe.
      for (i = threats.length - 1; i >= 0; i--) {
        var th = threats[i];
        th.age += dt;
        if (th.age > 3000) { threats.splice(i, 1); continue; }
        a = nodes[th.node];
        var caught = th.age > 1300;
        var pulse = (th.age % 900) / 900;
        if (!caught) {
          ctx.strokeStyle = rgba(colors.threat, 0.6 * (1 - pulse));
          ctx.beginPath(); ctx.arc(a.x, a.y, 4 + pulse * 18, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = colors.threat;
          ctx.beginPath(); ctx.arc(a.x, a.y, 4, 0, Math.PI * 2); ctx.fill();
          var k = Math.max(0, 1 - (th.age - 500) / 800);
          if (th.age > 500) {
            ctx.strokeStyle = rgba(colors.accent, 0.8);
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(a.x, a.y, 8 + k * 30, 0, Math.PI * 2); ctx.stroke();
            ctx.lineWidth = 1;
          }
        } else {
          var fade = 1 - (th.age - 1300) / 1700;
          ctx.strokeStyle = rgba(colors.accent, 0.8 * fade);
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(a.x, a.y, 8, 0, Math.PI * 2); ctx.stroke();
          ctx.lineWidth = 1;
          ctx.fillStyle = rgba(colors.accent, fade);
          ctx.beginPath(); ctx.arc(a.x, a.y, 3.5, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    function frame(t) {
      if (!running) return;
      var dt = last ? Math.min(t - last, 50) : 16;
      last = t;
      nextPacket -= dt; nextThreat -= dt;
      if (nextPacket <= 0 && nodes.length) {
        var from = Math.floor(Math.random() * nodes.length), nb = neighbours(from);
        if (nb.length) packets.push({ from: from, to: nb[Math.floor(Math.random() * nb.length)], t: 0, dur: 900 + Math.random() * 700 });
        nextPacket = 180 + Math.random() * 260;
      }
      if (nextThreat <= 0 && nodes.length) {
        threats.push({ node: Math.floor(Math.random() * nodes.length), age: 0 });
        nextThreat = 2200 + Math.random() * 1800;
      }
      draw(dt);
      requestAnimationFrame(frame);
    }
    function start() {
      if (running || reduceMotion || document.hidden) return;
      running = true; last = 0; requestAnimationFrame(frame);
    }
    function stop() { running = false; }

    readColors();
    resize();
    onThemeChange.push(readColors);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", readColors);
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener("resize", resize);

    if (!reduceMotion) {
      var hero = canvas.parentElement;
      hero.addEventListener("pointermove", function (e) {
        var r = canvas.getBoundingClientRect();
        pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
      });
      hero.addEventListener("pointerleave", function () { pointer = null; });
      document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
      if (hasIO) {
        new IntersectionObserver(function (en) { en[0].isIntersecting ? start() : stop(); }).observe(canvas);
      } else start();
    }
  }

  // Project filter: the topic buttons show only the cards tagged with that topic (topics: in each project file).
  document.querySelectorAll(".filter").forEach(function (bar) {
    var grid = bar.nextElementSibling;
    if (!grid || !grid.hasAttribute("data-filterable")) return;
    var buttons = bar.querySelectorAll(".chip-btn");
    var status = bar.querySelector(".filter-status");
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var topic = btn.getAttribute("data-topic"), shown = 0;
        buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
        grid.querySelectorAll("[data-topics]").forEach(function (card) {
          var match = !topic || card.getAttribute("data-topics").split("|").indexOf(topic) !== -1;
          card.hidden = !match;
          if (match) { shown++; card.classList.add("is-in"); }
        });
        if (status) status.textContent = shown + (shown === 1 ? " project shown" : " projects shown");
      });
    });
  });

  // Skills chart: a radar drawn from the legend buttons (score 1 to 4). Choosing an area highlights its
  // point and shows what backs it up.
  var chart = document.querySelector("[data-chart]");
  if (chart) {
    var svg = chart.querySelector(".radar");
    var items = Array.prototype.slice.call(chart.querySelectorAll(".legend-btn"));
    var detailLevel = chart.querySelector(".chart-detail-level");
    var detailText = chart.querySelector(".chart-detail-text");
    var NS = "http://www.w3.org/2000/svg", R = 112, max = 4, n = items.length, dots = [], labels = [];
    function pt(i, r) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / n;
      return [Math.cos(a) * r, Math.sin(a) * r];
    }
    function el(name, attrs, parent) {
      var e = document.createElementNS(NS, name);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(e);
      return e;
    }
    var g = el("g", { "aria-hidden": "true" });
    for (var ring = 1; ring <= max; ring++) {
      el("polygon", { "class": "radar-ring", points: items.map(function (_, i) { return pt(i, R * ring / max).join(","); }).join(" ") }, g);
    }
    items.forEach(function (_, i) { var p = pt(i, R); el("line", { "class": "radar-axis", x1: 0, y1: 0, x2: p[0], y2: p[1] }, g); });
    var shape = el("polygon", { "class": "radar-shape", points: items.map(function () { return "0,0"; }).join(" ") }, g);
    items.forEach(function (btn, i) {
      var s = +btn.getAttribute("data-score") || 0, p = pt(i, R * s / max), lp = pt(i, R + 22);
      var dot = el("circle", { "class": "radar-dot", cx: p[0], cy: p[1], r: 6 }, g);
      var label = el("text", { "class": "radar-label", x: lp[0], y: lp[1] + 4,
        "text-anchor": Math.abs(lp[0]) < 8 ? "middle" : (lp[0] > 0 ? "start" : "end") }, g);
      label.textContent = btn.getAttribute("data-short");
      [dot, label].forEach(function (target) {
        target.addEventListener("click", function () { select(i); });
        target.addEventListener("mouseenter", function () { select(i); });
      });
      dots.push(dot); labels.push(label);
    });
    function draw(progress) {
      shape.setAttribute("points", items.map(function (btn, i) {
        return pt(i, R * (+btn.getAttribute("data-score") || 0) / max * progress).join(",");
      }).join(" "));
    }
    function select(i) {
      items.forEach(function (b, j) {
        b.setAttribute("aria-pressed", String(i === j));
        dots[j].classList.toggle("is-active", i === j);
        labels[j].classList.toggle("is-active", i === j);
      });
      detailLevel.textContent = items[i].getAttribute("data-level");
      detailText.textContent = items[i].getAttribute("data-evidence");
    }
    items.forEach(function (btn, i) {
      btn.addEventListener("click", function () { select(i); });
      btn.addEventListener("mouseenter", function () { select(i); });
    });
    select(0);
    if (reduceMotion || !hasIO) draw(1);
    else {
      draw(0);
      new IntersectionObserver(function (en, obs) {
        if (!en[0].isIntersecting) return;
        obs.disconnect();
        var start = null;
        requestAnimationFrame(function grow(ts) {
          if (start === null) start = ts;
          var p = Math.min((ts - start) / 900, 1);
          draw(1 - Math.pow(1 - p, 3));
          if (p < 1) requestAnimationFrame(grow);
        });
      }, { threshold: 0.3 }).observe(svg);
    }
  }

  // Copy buttons (BibTeX on the Research page).
  document.querySelectorAll(".copy-btn").forEach(function (btn) {
    var label = btn.querySelector("span");
    btn.addEventListener("click", function () {
      var src = document.getElementById(btn.getAttribute("data-copy"));
      if (!src || !navigator.clipboard) return;
      navigator.clipboard.writeText(src.textContent.trim()).then(function () {
        var before = label.textContent;
        label.textContent = t("copied", "Copied");
        setTimeout(function () { label.textContent = before; }, 1600);
      });
    });
  });

  // Certificate pictures open larger in a dialog (Esc or the × button closes it).
  var lightbox = document.querySelector(".lightbox");
  if (lightbox && lightbox.showModal) {
    var lbImg = lightbox.querySelector("img"), lbCap = lightbox.querySelector(".lightbox-caption");
    document.querySelectorAll(".cert-thumb.has-img").forEach(function (btn) {
      btn.addEventListener("click", function () {
        lbImg.src = btn.getAttribute("data-full");
        lbImg.alt = btn.querySelector("img").alt;
        lbCap.textContent = btn.getAttribute("data-caption");
        lightbox.showModal();
      });
    });
    lightbox.addEventListener("click", function (e) { if (e.target === lightbox) lightbox.close(); });
  }

  // Contact form: posts to Web3Forms, which emails the message to the site owner.
  var form = document.getElementById("contact-form");
  if (!form) return;
  var status = form.querySelector(".form-status");
  var button = form.querySelector("button[type=submit]");
  var fallback = "Please email me directly at " + form.dataset.email + ".";
  function show(text, kind) {
    status.textContent = text;
    status.className = "form-status" + (kind ? " is-" + kind : "");
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = new FormData(form);
    if (!data.get("access_key")) {
      show("The form isn't set up yet. " + fallback, "error");
      return;
    }
    data.set("replyto", data.get("email"));
    button.disabled = true;
    show("Sending…");
    fetch(form.action, { method: "POST", body: data, headers: { Accept: "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.success) throw new Error(res.message);
        form.reset();
        show("Thanks, your message was sent. I'll reply by email.", "ok");
      })
      .catch(function () {
        show("Sorry, the message couldn't be sent. " + fallback, "error");
      })
      .then(function () { button.disabled = false; });
  });
})();
