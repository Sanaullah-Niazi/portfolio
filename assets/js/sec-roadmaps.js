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

  // Roadmap pages: the level buttons show one stage and open it; "All" shows every stage again.
  var levels = document.querySelector(".sr-levels");
  if (levels) {
    var btns = Array.prototype.slice.call(levels.querySelectorAll("[data-level]"));
    var stages = document.querySelectorAll(".sr-stage");
    function show(level) {
      stages.forEach(function (st) {
        var ok = !level || st.getAttribute("data-level") === level;
        st.hidden = !ok;
        if (level && ok) st.querySelector("details").open = true;
      });
      btns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-level") === level)); });
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () { show(b.getAttribute("data-level")); });
    });
    // The stage flow at the top links to #stage-<level>: open that stage when it is followed.
    function openFromHash() {
      var m = /^#stage-(\w+)$/.exec(location.hash);
      if (!m) return;
      show("");
      var st = document.getElementById("stage-" + m[1]);
      if (st) st.querySelector("details").open = true;
    }
    window.addEventListener("hashchange", openFromHash);
    openFromHash();
    levels.hidden = false;
  }
})();
