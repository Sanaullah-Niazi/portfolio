// Set the theme before the page paints, so there is no flash.
// Kept in its own file (not inline) so the Content Security Policy can block all inline scripts.
(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
  } catch (e) {}
})();
