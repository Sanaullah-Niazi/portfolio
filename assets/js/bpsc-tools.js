// BPSC interview prep: practice mode (flashcards and mock interview, FR-21 to FR-23), "My list" (FR-25) and the
// question form (FR-26 to FR-28). Uses window.bpscStore from bpsc.js, which falls back to memory when the browser
// blocks localStorage. Questions come from /bpsc-interview/index.json. No outside scripts except Turnstile on the form.
(function () {
  "use strict";
  var store = window.bpscStore;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var indexCache = null;
  function loadIndex(url) {
    if (!indexCache) indexCache = fetch(url, { credentials: "omit" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    return indexCache;
  }
  function answerHtml(it, box, qPrefix) {
    if (it.p) return '<p class="bp-guide-note">' + esc(box.dataset.own) + "</p>";
    var text = it.s || it.a || "";
    var long = !it.s && text.length > 700;
    if (long) text = text.slice(0, 700).replace(/\s+\S*$/, "") + " …";
    return '<p lang="en" dir="ltr">' + esc(text) + "</p>" +
      '<p><a href="' + esc(qPrefix + it.i + "/") + '">' + esc(box.dataset.full) + "</a></p>";
  }
  function qText(it, urdu) { return urdu && it.qu ? it.qu : it.q; }

  // ---- Practice ----
  var pr = document.querySelector(".bp-practice");
  if (pr) {
    var urdu = pr.dataset.lang === "ur", qPrefix = pr.dataset.q, sr = pr.querySelector(".bp-sr-status");
    var tabs = pr.querySelectorAll('[role="tab"]');
    tabs.forEach(function (t) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        var i = Array.prototype.indexOf.call(tabs, t), n = tabs[(i + 1) % tabs.length];
        select(n); n.focus();
      });
    });
    function select(t) {
      tabs.forEach(function (x) {
        var on = x === t;
        x.setAttribute("aria-selected", String(on)); x.tabIndex = on ? 0 : -1;
        document.getElementById(x.getAttribute("aria-controls")).hidden = !on;
      });
    }

    var prog = store.get("bpsc-practice", { k: [], r: [] });
    var setup = pr.querySelector(".bp-pr-setup"), count = pr.querySelector(".bp-pr-count");
    var card = pr.querySelector("#pr-cards .bp-card"), deck = [], cur = null;
    function showProgress() { count.textContent = pr.dataset.progress.replace("[k]", prog.k.length).replace("[r]", prog.r.length); }
    showProgress();
    function mark(id, knew) {
      prog.k = prog.k.filter(function (x) { return x !== id; });
      prog.r = prog.r.filter(function (x) { return x !== id; });
      (knew ? prog.k : prog.r).push(id);
      store.set("bpsc-practice", prog);
      showProgress();
    }
    function nextCard() {
      cur = deck.shift();
      var a = card.querySelector(".bp-card-a");
      a.hidden = true;
      card.querySelector(".bp-reveal").hidden = false;
      card.querySelector(".bp-knew").hidden = card.querySelector(".bp-again").hidden = true;
      if (!cur) { card.querySelector(".bp-card-meta").textContent = ""; card.querySelector(".bp-card-q").textContent = pr.dataset.done; card.querySelector(".bp-reveal").hidden = true; return; }
      card.querySelector(".bp-card-meta").textContent = cur.c;
      var h = card.querySelector(".bp-card-q");
      h.textContent = qText(cur, urdu);
      if (!(urdu && cur.qu)) { h.lang = "en"; h.dir = "ltr"; } else { h.removeAttribute("lang"); h.removeAttribute("dir"); }
      h.focus();
    }
    setup.addEventListener("submit", function (e) {
      e.preventDefault();
      var banks = Array.prototype.filter.call(setup.elements.bank, function (c) { return c.checked; }).map(function (c) { return c.value; });
      var onlyReview = setup.elements.review.checked;
      count.textContent = pr.dataset.loading;
      loadIndex(pr.dataset.index).then(function (data) {
        // Flashcards need an answer to reveal: personal questions and topics without an answer are left out.
        deck = shuffle(data.items.filter(function (it) {
          return banks.indexOf(it.b) >= 0 && !it.p && (it.s || it.a) && (!onlyReview || prog.r.indexOf(it.i) >= 0) && (onlyReview || prog.k.indexOf(it.i) < 0);
        }));
        showProgress();
        card.hidden = false;
        nextCard();
      }, function () { count.textContent = pr.dataset.error; });
    });
    card.querySelector(".bp-reveal").addEventListener("click", function () {
      var a = card.querySelector(".bp-card-a");
      a.innerHTML = answerHtml(cur, pr, qPrefix);
      a.hidden = false;
      this.hidden = true;
      card.querySelector(".bp-knew").hidden = card.querySelector(".bp-again").hidden = false;
      card.querySelector(".bp-knew").focus();
    });
    card.querySelector(".bp-knew").addEventListener("click", function () { mark(cur.i, true); nextCard(); });
    card.querySelector(".bp-again").addEventListener("click", function () { mark(cur.i, false); deck.push(cur); nextCard(); });
    pr.querySelector(".bp-pr-reset button").addEventListener("click", function () { prog = { k: [], r: [] }; store.set("bpsc-practice", prog); showProgress(); });

    // Mock interview (FR-22): 3 personal guides, 2 Islamiat, 2 Pakistan or Balochistan, 2 IT, 1 current affairs.
    var mock = pr.querySelector(".bp-mock"), done = pr.querySelector(".bp-mock-done"), qs = [], at = 0, timer = null;
    function pick(list, n) { return shuffle(list.slice()).slice(0, n); }
    function startMock() {
      loadIndex(pr.dataset.index).then(function (data) {
        var it = data.items, has = function (x) { return x.s || x.a; };
        qs = pick(it.filter(function (x) { return x.p; }), 3)
          .concat(pick(it.filter(function (x) { return x.b === "islamiat" && has(x); }), 2))
          .concat(pick(it.filter(function (x) { return (x.b === "pakistan-history" || x.b === "balochistan") && has(x); }), 2))
          .concat(pick(it.filter(function (x) { return x.b === "technical" && has(x); }), 2))
          .concat(pick(it.filter(function (x) { return x.b === "current-affairs" && has(x); }), 1));
        at = 0; done.hidden = true; mock.hidden = false; showMock();
      }, function () { sr.textContent = pr.dataset.error; });
    }
    function showMock() {
      clearInterval(timer);
      var q = qs[at];
      if (!q) { mock.hidden = true; done.hidden = false; done.querySelector("button").focus(); return; }
      mock.querySelector(".bp-card-meta").textContent = pr.dataset.qOf.replace("[n]", at + 1).replace("[t]", qs.length) + " · " + q.c;
      var h = mock.querySelector(".bp-card-q");
      h.textContent = qText(q, urdu);
      if (!(urdu && q.qu)) { h.lang = "en"; h.dir = "ltr"; } else { h.removeAttribute("lang"); h.removeAttribute("dir"); }
      var a = mock.querySelector(".bp-card-a"); a.hidden = true;
      mock.querySelector(".bp-reveal").hidden = false;
      h.focus();
      var t = mock.querySelector(".bp-timer");
      t.textContent = "";
      t.classList.remove("is-up");
      if (pr.querySelector('[name="timer"]').checked) {
        var left = 60;
        t.textContent = "1:00";
        timer = setInterval(function () {
          left--;
          t.textContent = "0:" + String(left).padStart(2, "0");
          if (left <= 0) { clearInterval(timer); t.textContent = pr.dataset.timeUp; t.classList.add("is-up"); sr.textContent = pr.dataset.timeUp; }
        }, 1000);
      }
    }
    pr.querySelectorAll(".bp-mock-start").forEach(function (b) { b.addEventListener("click", startMock); });
    mock.querySelector(".bp-reveal").addEventListener("click", function () {
      var a = mock.querySelector(".bp-card-a");
      a.innerHTML = answerHtml(qs[at], pr, qPrefix); a.hidden = false; this.hidden = true;
    });
    mock.querySelector(".bp-mock-next").addEventListener("click", function () { at++; showMock(); });
  }

  // ---- My list ----
  var ml = document.querySelector(".bp-mylist");
  if (ml) {
    var listEl = ml.querySelector(".bp-list"), empty = ml.querySelector(".bp-list-empty"), tools = ml.querySelector(".bp-list-tools");
    var mlUrdu = ml.dataset.lang === "ur";
    function renderList() {
      var saved = store.get("bpsc-list", []);
      empty.hidden = saved.length > 0; tools.hidden = saved.length === 0;
      if (!saved.length) { listEl.innerHTML = ""; return; }
      loadIndex(ml.dataset.index).then(function (data) {
        var byId = {};
        data.items.forEach(function (it) { byId[it.i] = it; });
        listEl.innerHTML = saved.filter(function (id) { return byId[id]; }).map(function (id) {
          var it = byId[id];
          return '<li class="bp-list-item"><h2><a href="' + esc(ml.dataset.q + id + "/") + '"' + (mlUrdu && it.qu ? "" : ' lang="en" dir="ltr"') + ">" + esc(qText(it, mlUrdu)) + "</a></h2>" +
            (it.p ? '<p class="bp-guide-note">' + esc(ml.dataset.own) + "</p>" : '<p lang="en" dir="ltr">' + esc(it.s || it.a || "") + "</p>") +
            '<button class="btn bp-list-remove" type="button" data-id="' + esc(id) + '">' + esc(ml.dataset.remove) + "</button></li>";
        }).join("");
      }, function () { listEl.innerHTML = "<li>" + esc(ml.dataset.error) + "</li>"; });
    }
    ml.addEventListener("click", function (e) {
      var r = e.target.closest(".bp-list-remove");
      if (r) { store.set("bpsc-list", store.get("bpsc-list", []).filter(function (x) { return x !== r.dataset.id; })); renderList(); }
      if (e.target.closest(".bp-list-clear")) { store.set("bpsc-list", []); renderList(); }
    });
    renderList();
  }

  // ---- Question form ----
  var form = document.querySelector(".bp-form");
  if (form) {
    var params = new URLSearchParams(location.search), status = form.querySelector(".bp-form-status");
    var type = params.get("type");
    if (type) { var radio = form.querySelector('input[name="type"][value="' + (["question", "answer", "correction", "report"].indexOf(type) >= 0 ? type : "question") + '"]'); if (radio) radio.checked = true; }
    var id = params.get("id");
    if (id && /^[a-z]{2,5}-\d{3,}$/.test(id)) {
      form.elements.qid.value = id;
      form.querySelector(".bp-qid").hidden = false;
      var prefix = { gen: "general", isl: "islamiat", tec: "technical", his: "pakistan-history", bal: "balochistan", cur: "current-affairs" }[id.split("-")[0]];
      if (prefix) form.elements.bank.value = prefix;
      // Fill in the question's text, so the visitor only writes the better answer or the correction.
      fetch("/bpsc-interview/index.json").then(function (r) { return r.json(); }).then(function (d) {
        var it = (d.items || []).filter(function (x) { return x.i === id; })[0];
        if (it && !form.elements.question.value) form.elements.question.value = (document.documentElement.lang === "ur" && it.qu) || it.q;
      }).catch(function () {});
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var el = form.elements, btn = form.querySelector('button[type="submit"]');
      if (!el.consent.checked) { status.textContent = form.dataset.errConsent; el.consent.focus(); return; }
      if (el.question.value.trim().length < 5) { el.question.focus(); el.question.reportValidity && el.question.reportValidity(); return; }
      var token = (el["cf-turnstile-response"] || {}).value || "";
      var body = {
        type: form.querySelector('input[name="type"]:checked').value, bank: el.bank.value, question: el.question.value,
        answer: el.answer.value, qid: el.qid.value, zone: el.zone.value, date: el.date.value, source: el.source.value,
        name: el.name.value, consent: true, token: token,
      };
      btn.disabled = true; status.textContent = form.dataset.sending;
      fetch(form.dataset.api, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), credentials: "omit" })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (j) {
          if (j && j.ok) {
            form.reset();
            form.querySelectorAll("fieldset, label, .btn-row, .cf-turnstile, .muted").forEach(function (x) { x.hidden = true; });
            status.textContent = form.dataset.thanks.replace("[ref]", j.ref);
            status.classList.add("is-done");
            return;
          }
          var err = (j && j.error) || "";
          status.textContent = err === "captcha" ? form.dataset.errCaptcha : err === "rate_limited" ? form.dataset.errLimit
            : err === "too_long" ? form.dataset.errLong : err === "consent" ? form.dataset.errConsent : err === "not_configured" ? form.dataset.off : form.dataset.errOther;
          if (window.turnstile) window.turnstile.reset();
        }, function () { status.textContent = form.dataset.errOther; })
        .then(function () { btn.disabled = false; });
    });
  }
})();
