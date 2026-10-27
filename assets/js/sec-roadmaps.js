// Security roadmaps: search and filters on the index and Frameworks pages, and the level buttons on each roadmap.
// Without JavaScript the controls stay hidden and everything is listed.
(function () {
  "use strict";

  function pick(buttons, btn) {
    buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
  }

  // Index and Frameworks pages: a search box plus category (data-cat) and level (data-lvl) buttons.
  var controls = document.getElementById("sr-controls");
  if (controls) {
    var q = document.getElementById("sr-q");
    var catBtns = Array.prototype.slice.call(controls.querySelectorAll("[data-cat]"));
    var lvlBtns = Array.prototype.slice.call(controls.querySelectorAll("[data-lvl]"));
    var status = controls.querySelector(".sr-status");
    var none = document.getElementById("sr-none");
    var sections = Array.prototype.slice.call(document.querySelectorAll(".sr-cat"));
    var cat = "", lvl = "";

    function apply() {
      var words = q.value.toLowerCase().trim().split(/\s+/).filter(Boolean), shown = 0;
      sections.forEach(function (sec) {
        var any = false;
        sec.querySelectorAll(".sr-item").forEach(function (item) {
          var itemCat = item.getAttribute("data-cat") || sec.getAttribute("data-cat");
          var text = item.getAttribute("data-search");
          var ok = (!cat || itemCat === cat) &&
            (!lvl || item.getAttribute("data-lvl") === lvl) &&
            words.every(function (w) { return text.indexOf(w) !== -1; });
          item.hidden = !ok;
          if (ok) { any = true; if (!item.classList.contains("is-soon")) shown++; }
        });
        sec.hidden = !any;
        // Hide the "coming soon" note when none of the planned names match.
        var note = sec.querySelector(".sr-soon-note"), soon = sec.querySelector(".sr-soon");
        if (note && soon) note.hidden = soon.hidden = !soon.querySelector(".sr-item:not([hidden])");
      });
      if (status) status.textContent = shown === 1 && status.hasAttribute("data-one") ? status.getAttribute("data-one") : status.getAttribute("data-template").replace("[n]", shown);
      if (none) none.hidden = sections.some(function (s) { return !s.hidden; });
    }

    catBtns.forEach(function (b) {
      b.addEventListener("click", function () { cat = b.getAttribute("data-cat"); pick(catBtns, b); apply(); });
    });
    lvlBtns.forEach(function (b) {
      b.addEventListener("click", function () { lvl = b.getAttribute("data-lvl"); pick(lvlBtns, b); apply(); });
    });
    q.addEventListener("input", apply);
    var clear = document.getElementById("sr-clear");
    if (clear) clear.addEventListener("click", function () {
      q.value = ""; cat = ""; lvl = "";
      if (catBtns[0]) pick(catBtns, catBtns[0]);
      if (lvlBtns[0]) pick(lvlBtns, lvlBtns[0]);
      apply(); q.focus();
    });
    controls.hidden = false;
    apply();
  }

  // Progress is kept per roadmap in this browser only, as {"topic-id": "done" | "doing" | "skip"}.
  // Storage can be blocked (private windows, strict settings), so every read and write is guarded.
  function load(domain) {
    try { return JSON.parse(localStorage.getItem("sr-progress:" + domain)) || {}; } catch (e) { return {}; }
  }
  function save(domain, data) {
    try { localStorage.setItem("sr-progress:" + domain, JSON.stringify(data)); } catch (e) { /* not saved */ }
  }
  function countDone(data) {
    return Object.keys(data).filter(function (k) { return data[k] === "done"; }).length;
  }

  // Index page: show each visitor's progress on the roadmap cards.
  document.querySelectorAll("[data-progress]").forEach(function (el) {
    var total = +el.getAttribute("data-total"), done = countDone(load(el.getAttribute("data-progress")));
    if (!total || !done) return;
    el.textContent = el.getAttribute("data-template").replace("[p]", Math.round(done * 100 / total));
    el.hidden = false;
  });

  // Roadmap pages: the interactive map.
  var map = document.querySelector(".mp");
  if (!map) return;
  var domain = map.getAttribute("data-domain"), total = +map.getAttribute("data-total");
  var state = load(domain);
  var nodes = Array.prototype.slice.call(map.querySelectorAll(".mp-node[data-id]"));
  var drawer = document.getElementById("mp-drawer");
  var panel = drawer.querySelector(".mp-panel"), body = drawer.querySelector(".mp-panel-body");
  var statusBox = drawer.querySelector(".mp-status");
  var statusBtns = Array.prototype.slice.call(statusBox.querySelectorAll("[data-set]"));
  var progress = map.querySelector(".mp-progress"), count = progress.querySelector(".mp-count");
  var bar = progress.querySelector(".mp-bar span");
  var current = null, opener = null;

  function paint() {
    nodes.forEach(function (n) {
      var st = state[n.getAttribute("data-id")];
      if (st) n.setAttribute("data-state", st); else n.removeAttribute("data-state");
    });
    var done = countDone(state);
    count.textContent = count.getAttribute("data-template").replace("[d]", done).replace("[n]", total);
    bar.style.width = (total ? done * 100 / total : 0) + "%";
    if (current) statusBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(state[current] === b.getAttribute("data-set"))); });
  }

  function open(key, from) {
    var src = document.getElementById(key);
    if (!src) return false;
    opener = from || null;
    body.innerHTML = src.innerHTML;
    var h = body.querySelector("h3");
    if (h) h.id = "mp-panel-title";
    current = src.getAttribute("data-id");
    statusBox.hidden = !current;
    drawer.hidden = false;
    document.documentElement.classList.add("mp-open");
    paint();
    panel.focus();
    if (history.replaceState) history.replaceState(null, "", "#" + key);
    return true;
  }
  function close() {
    if (drawer.hidden) return;
    drawer.hidden = true;
    document.documentElement.classList.remove("mp-open");
    current = null;
    if (history.replaceState) history.replaceState(null, "", location.pathname + location.search);
    if (opener) opener.focus();
  }

  map.addEventListener("click", function (e) {
    var a = e.target.closest("[data-node]");
    if (a && open(a.getAttribute("data-node"), a)) e.preventDefault();
  });
  drawer.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) close(); });
  document.addEventListener("keydown", function (e) {
    if (drawer.hidden) return;
    if (e.key === "Escape") close();
    // Keep keyboard focus inside the panel while it is open.
    if (e.key === "Tab") {
      var f = panel.querySelectorAll("a[href], button:not([hidden])");
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  statusBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      var v = b.getAttribute("data-set");
      if (state[current] === v) delete state[current]; else state[current] = v;
      save(domain, state); paint();
    });
  });
  progress.querySelector(".mp-reset").addEventListener("click", function (e) {
    if (!window.confirm(e.currentTarget.getAttribute("data-confirm") || "Reset?")) return;
    state = {}; save(domain, state); paint();
  });
  // Another tab changed the progress: follow it.
  window.addEventListener("storage", function (e) {
    if (e.key === "sr-progress:" + domain) { state = load(domain); paint(); }
  });

  // The level buttons show one stage of the map; "All" shows every stage again.
  var levels = map.querySelector(".sr-levels");
  if (levels) {
    var lb = Array.prototype.slice.call(levels.querySelectorAll("[data-level]"));
    lb.forEach(function (b) {
      b.addEventListener("click", function () {
        var level = b.getAttribute("data-level");
        map.querySelectorAll(".mp-stage").forEach(function (st) { st.hidden = !!level && st.getAttribute("data-level") !== level; });
        lb.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      });
    });
    levels.hidden = false;
  }

  // With JavaScript the details open in the panel, so the long list below the map is hidden.
  document.getElementById("topics").hidden = true;
  document.querySelectorAll(".mp-no-js").forEach(function (el) { el.hidden = true; });
  map.querySelectorAll(".mp-js-only").forEach(function (el) { el.hidden = false; });
  progress.hidden = false;
  paint();
  var m = /^#([ts]-[\w-]+)$/.exec(location.hash);
  if (m) open(m[1]);
})();
