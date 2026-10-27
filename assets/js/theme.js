// Set the theme (and saved language) before the page paints, so there is no flash.
// Kept in its own file (not inline) so the Content Security Policy can block all inline scripts.
(function () {
  var root = document.documentElement;
  // Lets the CSS hide things (menu, reveal animations) only when JavaScript is running.
  root.classList.add("js");
  try {
    var t = localStorage.getItem("theme");
    if (t === "light" || t === "dark") root.setAttribute("data-theme", t);
    // Language chosen on an earlier visit: set it (and right-to-left for Urdu) now; main.js swaps the text.
    var l = localStorage.getItem("lang");
    if (l === "ur" || l === "de" || l === "zh") {
      root.setAttribute("lang", l === "zh" ? "zh-Hans" : l);
      if (l === "ur") root.setAttribute("dir", "rtl");
    }
  } catch (e) {}
})();
