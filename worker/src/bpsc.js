// BPSC interview prep: the question form (/bpsc-interview/submit/ on the website), FR-48 to FR-52.
//
//   POST /bpsc/submit   {type, bank, question, answer, qid, zone, date, source, name, consent, token}
//
// Checks the Turnstile CAPTCHA and lengths, strips HTML, removes phone numbers, emails and CNIC numbers, allows
// 5 submissions per visitor per day, and opens an issue in the private repository Sanaullah-Niazi/bpsc-submissions
// (a private repository, so nothing is public before sana approves it). Nothing reaches the website from here:
// an approved issue becomes a pull request, and the merge publishes it.
// The token (secret BPSC_GITHUB_TOKEN) is a fine-grained token that can only write issues in that repository.

export const TYPES = { question: "new question", answer: "better answer", correction: "correction", report: "interview report" };
export const BANKS = ["general", "islamiat", "technical", "pakistan-history", "balochistan", "current-affairs", "not-sure"];
export const LIMITS = { question: 500, answer: 3000, source: 300, name: 40, zone: 40, qid: 20 };

export function codeError(code, status = 400) {
  const e = new Error(code);
  e.code = code;
  e.status = status;
  return e;
}

// Plain text with no HTML, no links that could carry tracking, and no personal contact data (FR-49).
export function clean(value, max) {
  let s = typeof value === "string" ? value : "";
  s = s.normalize("NFC").replace(/<[^>]*>/g, " ").replace(/[<>]/g, " ");
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "");
  s = s.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email removed]");
  s = s.replace(/\b\d{5}-?\d{7}-?\d\b/g, "[ID removed]"); // CNIC: 12345-1234567-1
  // Phone numbers: +92 300 1234567, 0300-1234567, 03001234567, (021) 3456 7890 and similar runs of 9+ digits.
  s = s.replace(/(?:\+|00)?\d[\d\s().-]{8,}\d/g, (m) => (m.replace(/\D/g, "").length >= 9 ? "[number removed]" : m));
  s = s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return s.length > max ? null : s;
}

export function readSubmission(input) {
  const type = Object.keys(TYPES).includes(input.type) ? input.type : null;
  const bank = BANKS.includes(input.bank) ? input.bank : null;
  if (!type || !bank) throw codeError("bad_request");
  if (input.consent !== true) throw codeError("consent");
  const out = { type, bank };
  for (const [k, max] of Object.entries(LIMITS)) {
    const v = clean(input[k], max);
    if (v === null) throw codeError("too_long");
    out[k] = v;
  }
  if (out.question.length < 5) throw codeError("bad_request");
  if (out.qid && !/^[a-z]{2,5}-\d{3,}$/.test(out.qid)) out.qid = "";
  out.date = /^\d{4}-\d{2}-\d{2}$/.test(input.date || "") ? input.date : "";
  out.name = out.name.split(/\s+/)[0] || ""; // first name only
  return out;
}

export function issueFor(s, ref) {
  const lines = [
    `**Type:** ${TYPES[s.type]}`,
    `**Bank:** ${s.bank}`,
    s.qid ? `**Question id:** ${s.qid}` : null,
    s.zone || s.date ? `**Asked in:** ${[s.zone, s.date].filter(Boolean).join(", ")}` : null,
    `**Credit:** ${s.name || "Anonymous"}`,
    `**Reference:** ${ref}`,
    "",
    "### Question",
    "",
    quote(s.question),
    "",
    "### Suggested answer",
    "",
    s.answer ? quote(s.answer) : "_(none)_",
    "",
    "### Source",
    "",
    s.source ? quote(s.source) : "_(none)_",
    "",
    "---",
    "Sent through the website form. To publish it, add the label **approved**: a pull request with the exact text opens",
    "in the website repository, and merging it publishes the question. To reject it, close the issue with the label **rejected**.",
  ];
  const title = `[${TYPES[s.type]}] ${s.question.replace(/\s+/g, " ").slice(0, 90)}`;
  const labels = [`type:${s.type}`, `bank:${s.bank}`];
  return { title, body: lines.filter((l) => l !== null).join("\n"), labels };
}

function quote(text) {
  // As a quote, so Markdown and @mentions in a visitor's text do nothing.
  return text.split("\n").map((l) => "> " + l.replace(/@/g, "@\u200b").replace(/^#/, "\\#")).join("\n");
}

export function reference() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(6));
  return "BP-" + [...b].map((x) => abc[x % abc.length]).join("");
}

// Opens the issue. deps: { verify(token), limit(), fetch } from index.js, so the rest can be tested alone.
export async function submit(input, env, deps) {
  if (!env.BPSC_GITHUB_TOKEN) throw codeError("not_configured", 503);
  await deps.verify(input.token);
  const s = readSubmission(input);
  await deps.limit();
  const ref = reference();
  const issue = issueFor(s, ref);
  const repo = env.BPSC_REPO || "Sanaullah-Niazi/bpsc-submissions";
  const r = await (deps.fetch || fetch)(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.BPSC_GITHUB_TOKEN}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      "user-agent": "sanaullahniazi.com-bpsc-form",
      "x-github-api-version": "2022-11-28",
    },
    body: JSON.stringify(issue),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) {
    console.error("bpsc issue", r.status, (await r.text()).slice(0, 300));
    throw codeError("store_failed", 502);
  }
  return { ok: true, ref };
}
