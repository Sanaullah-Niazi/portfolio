// Security scholarships page (/scholarships/): filters, sorting and "closes in N days" for the daily list,
// and the same level/region/search filters for the yearly programmes. Anything whose deadline has passed
// since the last daily update is hidden here too, so a closed posting never shows as open.
(function () {
  "use strict";
  var root = document.querySelector("[data-so]");
  if (!root) return;
  var form = root.querySelector("[data-so-filters]");
  var list = root.querySelector("[data-so-list]");
  var progs = root.querySelector("[data-so-progs]");
  var count = root.querySelector(".so-count");
  var none = root.querySelector("[data-so-none]");
  var DAY = 864e5;

  // Today in the visitor's own time zone, as a day number.
  var now = new Date();
  var today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY;
  function dayOf(iso) {
    var p = (iso || "").split("-");
    return p.length === 3 ? Date.UTC(+p[0], +p[1] - 1, +p[2]) / DAY : null;
  }
  function fmt(t, n) { return t.replace("%n", n); }

  // Country names in the page's language (the HTML carries the two-letter code); the country menu is then sorted by name.
  var names = null;
  try { names = new Intl.DisplayNames([root.getAttribute("data-lang") || "en"], { type: "region" }); } catch (e) { names = null; }
  if (names) {
    Array.prototype.forEach.call(root.querySelectorAll("[data-cc]"), function (el) {
      try { el.textContent = names.of(el.getAttribute("data-cc")) || el.textContent; } catch (e) { /* keep the code */ }
    });
    var csel = form.elements.country;
    if (csel) {
      var opts = Array.prototype.slice.call(csel.options, 1);
      opts.sort(function (a, b) { return a.textContent.localeCompare(b.textContent); });
      opts.forEach(function (o) { csel.appendChild(o); });
    }
  }

  var items = list ? Array.prototype.slice.call(list.children) : [];
  items.forEach(function (li) {
    var d = dayOf(li.getAttribute("data-deadline"));
    li._left = d === null ? null : d - today;
    li._text = li.textContent.toLowerCase();
    if (li._left !== null && li._left < 0) { li.remove(); li._gone = true; return; }
    var left = li.querySelector("[data-left]");
    if (left && li._left !== null) {
      left.textContent = "(" + (li._left === 0 ? root.getAttribute("data-closes-today")
        : fmt(root.getAttribute(li._left === 1 ? "data-closes-one" : "data-closes-many"), li._left)) + ")";
      if (li._left <= 14) li.classList.add("is-soon");
    }
  });
  items = items.filter(function (li) { return !li._gone; });
  var cards = progs ? Array.prototype.slice.call(progs.children) : [];
  cards.forEach(function (li) { li._text = li.textContent.toLowerCase(); });

  // Filters are kept in the address (?level=phd&region=uk), so a filtered list can be shared.
  var params = new URLSearchParams(location.search);
  ["q", "level", "region", "country", "field", "deadline", "sort"].forEach(function (k) {
    var el = form.elements[k];
    if (el && params.get(k)) el.value = params.get(k);
  });

  function has(li, attr, v) { return !v || li.getAttribute(attr).split("|").indexOf(v) !== -1; }

  function apply() {
    var q = form.elements.q.value.trim().toLowerCase();
    var level = form.elements.level.value, region = form.elements.region.value;
    var field = form.elements.field.value, dl = form.elements.deadline.value, sort = form.elements.sort.value;
    var country = form.elements.country ? form.elements.country.value : "";
    var opt = country && form.elements.country.selectedOptions[0];
    var countryRegion = opt ? opt.getAttribute("data-region") : "";
    var shown = 0;
    items.forEach(function (li) {
      var ok = has(li, "data-level", level) && has(li, "data-region", region) && has(li, "data-fields", field) &&
        (!country || li.getAttribute("data-country") === country) &&
        (!q || li._text.indexOf(q) !== -1);
      if (ok && dl === "stated") ok = li._left !== null;
      else if (ok && dl) ok = li._left !== null && li._left <= +dl;
      li.hidden = !ok;
      if (ok) shown++;
    });
    if (list) {
      var sorted = items.slice().sort(sort === "new"
        ? function (a, b) { return b.getAttribute("data-posted").localeCompare(a.getAttribute("data-posted")); }
        : function (a, b) { return (a._left === null ? 1e6 : a._left) - (b._left === null ? 1e6 : b._left); });
      sorted.forEach(function (li) { list.appendChild(li); });
    }
    cards.forEach(function (li) {
      // A programme shows for a country if it is in that country, or (when it has no single country) covers its region or the world.
      var r = li.getAttribute("data-region"), c = li.getAttribute("data-country");
      var inCountry = !country || c === country || (!c && (r === countryRegion || r === "global"));
      li.hidden = !(has(li, "data-level", level) && (!region || r === region || r === "global") && inCountry &&
        (!q || li._text.indexOf(q) !== -1));
    });
    if (count) count.textContent = shown + " " + root.getAttribute(shown === 1 ? "data-shown-one" : "data-shown-many");
    if (none) none.hidden = shown !== 0;

    var p = new URLSearchParams();
    ["q", "level", "region", "country", "field", "deadline"].forEach(function (k) { if (form.elements[k] && form.elements[k].value) p.set(k, form.elements[k].value); });
    if (sort !== "deadline") p.set("sort", sort);
    var qs = p.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  }

  form.addEventListener("input", apply);
  form.addEventListener("change", apply);
  form.addEventListener("submit", function (e) { e.preventDefault(); apply(); });
  form.addEventListener("reset", function () { setTimeout(apply, 0); });
  apply();
})();
