// Set the theme before the page paints, so there is no flash.
// Kept in its own file (not inline) so the Content Security Policy can block all inline scripts.
(function () {
  var root = document.documentElement;
  // Lets the CSS hide things (menu, reveal animations) only when JavaScript is running.
  root.classList.add("js");
  try {
    var t = localStorage.getItem("theme");
    if (t === "light" || t === "dark") root.setAttribute("data-theme", t);
  } catch (e) {}
})();
