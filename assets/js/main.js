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

  // Contact form: sends through Formspree when an endpoint is set in _config.yml,
  // otherwise opens the visitor's email app with the message filled in.
  var form = document.getElementById("contact-form");
  if (!form) return;
  var status = form.querySelector(".form-status");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = new FormData(form);
    var endpoint = form.getAttribute("action");
    if (!endpoint) {
      var subject = encodeURIComponent("Message from " + data.get("name"));
      var body = encodeURIComponent(data.get("message") + "\n\n" + data.get("name") + " <" + data.get("email") + ">");
      window.location.href = "mailto:" + form.dataset.email + "?subject=" + subject + "&body=" + body;
      status.textContent = "Your email app should open with the message ready to send.";
      return;
    }
    status.textContent = "Sending…";
    fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } })
      .then(function (r) {
        if (!r.ok) throw new Error();
        form.reset();
        status.textContent = "Thanks, your message was sent. I'll reply by email.";
      })
      .catch(function () {
        status.textContent = "The message couldn't be sent. Please email me directly at " + form.dataset.email + ".";
      });
  });
})();
