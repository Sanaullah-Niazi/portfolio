// Site behaviour: theme toggle, language menu, mobile menu, scroll effects,
// project filter, skills chart, BibTeX copy, certificate lightbox and the contact form.
// Plain JavaScript, no libraries. Anything that moves is skipped when the visitor prefers reduced motion.
(function () {
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Theme toggle: remembers the visitor's choice.
  var themeBtn = document.querySelector(".theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var current = root.getAttribute("data-theme") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      var next = current === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }

  // Language menu: a <details> list of links to this page in each language. Close it on outside click or Esc.
  var langMenu = document.querySelector(".lang-menu");
  if (langMenu) {
    document.addEventListener("click", function (e) { if (langMenu.open && !langMenu.contains(e.target)) langMenu.open = false; });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && langMenu.open) { langMenu.open = false; langMenu.querySelector("summary").focus(); }
    });
  }

  // Mobile menu.
  var nav = document.getElementById("site-nav");
  var menuBtn = document.querySelector(".menu-toggle");
  function setMenu(open) {
    if (!nav || !menuBtn) return;
    nav.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", menuBtn.getAttribute(open ? "data-label-close" : "data-label-open") || (open ? "Close menu" : "Open menu"));
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
    window.matchMedia("(min-width: 1101px)").addEventListener("change", function () { setMenu(false); });
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
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
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
        if (status) status.textContent = shown + " " + (grid.getAttribute(shown === 1 ? "data-shown-one" : "data-shown-many") || "projects shown");
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
        label.textContent = btn.getAttribute("data-copied") || "Copied";
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
        lbImg.hidden = false;
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
  var msg = function (key, fallbackText) { return form.getAttribute("data-msg-" + key) || fallbackText; };
  var fallback = msg("fallback", "Please email me directly at") + " " + form.dataset.email + ".";
  function show(text, kind) {
    status.textContent = text;
    status.className = "form-status" + (kind ? " is-" + kind : "");
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = new FormData(form);
    if (!data.get("access_key")) {
      show(msg("not-ready", "The form isn't set up yet.") + " " + fallback, "error");
      return;
    }
    data.set("replyto", data.get("email"));
    button.disabled = true;
    show(msg("sending", "Sending…"));
    fetch(form.action, { method: "POST", body: data, headers: { Accept: "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.success) throw new Error(res.message);
        form.reset();
        show(msg("sent", "Thanks, your message was sent. I'll reply by email."), "ok");
      })
      .catch(function () {
        show(msg("failed", "Sorry, the message couldn't be sent.") + " " + fallback, "error");
      })
      .then(function () { button.disabled = false; });
  });
})();
