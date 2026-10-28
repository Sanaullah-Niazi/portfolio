// The Roadmaps library (/roadmaps/): the search box, and old links to a learning path.
(function () {
  var page = document.querySelector(".rm-lib");
  if (!page) return;

  // The learning paths used to be sections of this page (/roadmaps/#web, /roadmaps/#web-2). Each now has its own page.
  var ids = (page.getAttribute("data-paths") || "").split(" ");
  var m = /^#([a-z-]+?)(-\d+)?$/.exec(location.hash);
  if (m && ids.indexOf(m[1]) !== -1) {
    location.replace(page.getAttribute("data-base") + m[1] + "/" + (m[2] ? "#" + m[1] + m[2] : ""));
    return;
  }

  // Search: hide the roadmaps that don't match every word typed, then any box and section left empty.
  var box = page.querySelector(".rm-search");
  var input = document.getElementById("rm-q");
  var none = document.getElementById("rm-none");
  if (!box || !input) return;
  box.hidden = false;
  var items = page.querySelectorAll(".rm-box li");
  var norm = function (s) { return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, ""); };
  var keys = Array.prototype.map.call(items, function (li) {
    return norm((li.getAttribute("data-k") || "") + " " + li.textContent);
  });

  function filter() {
    var words = norm(input.value).split(/\s+/).filter(Boolean);
    items.forEach(function (li, i) {
      li.hidden = !words.every(function (w) { return keys[i].indexOf(w) !== -1; });
    });
    var any = false;
    page.querySelectorAll(".rm-sec").forEach(function (sec) {
      var shown = 0;
      sec.querySelectorAll(".rm-box").forEach(function (b) {
        var n = b.querySelectorAll("li:not([hidden])").length;
        b.hidden = n === 0;
        shown += n;
      });
      sec.hidden = shown === 0;
      if (shown) any = true;
    });
    none.hidden = any;
  }
  input.addEventListener("input", filter);

  // "/" jumps to the search box, as on many documentation sites.
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && !/^(input|textarea|select)$/i.test(document.activeElement.tagName)) {
      e.preventDefault();
      input.focus();
    }
  });
})();
