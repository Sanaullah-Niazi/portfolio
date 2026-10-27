// Set the theme (and Urdu direction) before the page paints, so there is no flash.
// Kept in its own file (not inline) so the Content Security Policy can block all inline scripts.
(function () {
  var root = document.documentElement;
  // Lets the CSS hide things (menu, reveal animations) only when JavaScript is running.
  root.classList.add("js");
  try {
    var t = localStorage.getItem("theme");
    if (t === "light" || t === "dark") root.setAttribute("data-theme", t);
    // Urdu chosen on an earlier visit: switch direction now; main.js swaps the text.
    if (localStorage.getItem("lang") === "ur") { root.setAttribute("lang", "ur"); root.setAttribute("dir", "rtl"); }
  } catch (e) {}
})();
