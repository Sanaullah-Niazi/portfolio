import { test } from "node:test";
import assert from "node:assert/strict";
import { clean, readSubmission, issueFor, submit } from "../src/bpsc.js";

const base = { type: "question", bank: "islamiat", question: "Who was the first Caliph?", consent: true, token: "t" };

test("clean strips HTML and personal contact data", () => {
  assert.equal(clean("<b>Hi</b> <script>x</script>", 100), "Hi x");
  assert.equal(clean("call 0300-1234567 now", 100), "call [number removed] now");
  assert.equal(clean("+92 300 1234567", 100), "[number removed]");
  assert.equal(clean("mail me at a.b@example.com", 100), "mail me at [email removed]");
  assert.equal(clean("CNIC 54400-1234567-1", 100), "CNIC [ID removed]");
  assert.equal(clean("born 1947 and 1971", 100), "born 1947 and 1971");
  assert.equal(clean("x".repeat(11), 10), null);
});

test("readSubmission checks fields", () => {
  assert.throws(() => readSubmission({ ...base, consent: false }), /consent/);
  assert.throws(() => readSubmission({ ...base, type: "spam" }), /bad_request/);
  assert.throws(() => readSubmission({ ...base, question: "x".repeat(501) }), /too_long/);
  const s = readSubmission({ ...base, name: "Ali Khan", qid: "isl-001", date: "2026-12-14", zone: "Kalat" });
  assert.equal(s.name, "Ali");
  assert.equal(s.qid, "isl-001");
  assert.equal(readSubmission({ ...base, qid: "../x" }).qid, "");
});

test("issueFor quotes the visitor's text and labels it", () => {
  const i = issueFor(readSubmission({ ...base, answer: "@someone # heading" }), "BP-ABC123");
  assert.deepEqual(i.labels, ["type:question", "bank:islamiat"]);
  assert.match(i.body, /> @\u200bsomeone # heading/);
  assert.match(issueFor(readSubmission({ ...base, question: "# Big title here" }), "x").body, /> \\# Big/);
  assert.match(i.body, /Credit:\*\* Anonymous/);
  assert.match(i.body, /BP-ABC123/);
});

test("submit verifies, limits and opens the issue", async () => {
  const calls = [];
  const deps = {
    verify: async (t) => calls.push("verify:" + t),
    limit: async () => calls.push("limit"),
    fetch: async (url, opts) => { calls.push(url); assert.match(opts.headers.authorization, /Bearer tok/); return new Response("{}", { status: 201 }); },
  };
  const r = await submit(base, { BPSC_GITHUB_TOKEN: "tok" }, deps);
  assert.equal(r.ok, true);
  assert.match(r.ref, /^BP-[A-Z2-9]{6}$/);
  assert.deepEqual(calls, ["verify:t", "limit", "https://api.github.com/repos/Sanaullah-Niazi/bpsc-submissions/issues"]);
  await assert.rejects(submit(base, {}, deps), /not_configured/);
  const sixth = { ...deps, limit: async () => { const e = new Error("rate_limited"); e.code = "rate_limited"; throw e; } };
  await assert.rejects(submit(base, { BPSC_GITHUB_TOKEN: "tok" }, sixth), /rate_limited/);
});
