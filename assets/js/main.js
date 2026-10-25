// Theme toggle: remembers the visitor's choice.
(function () {
  var btn = document.querySelector(".theme-toggle");
  if (btn) {
    btn.addEventListener("click", function () {
      var root = document.documentElement;
      var current = root.getAttribute("data-theme") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      var next = current === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
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
