# bpsc-submissions (private): setup

Questions, answers and corrections sent through the form at sanaullahniazi.com/bpsc-interview/submit/ land here as
issues, in a **private** repository, so nobody sees them before they are approved. These are the steps to set it up once.

1. **Create the repository.** On GitHub: New repository, name `bpsc-submissions`, **Private**. Add the labels
   `approved`, `rejected` and `ai-suggested` (Issues > Labels). The form adds `type:...` and `bank:...` labels itself.
2. **Token for the website form.** Settings (your account) > Developer settings > Fine-grained tokens > Generate:
   repository access *Only select repositories* > `bpsc-submissions`; permissions *Issues: Read and write*, nothing else.
   Put it in the Worker: in the `worker/` folder run `npx wrangler secret put BPSC_GITHUB_TOKEN` and paste it
   (or add it under Cloudflare > Workers > site-checker > Settings > Variables and secrets).
3. **Approve workflow.** Copy `.github/workflows/approve.yml` from this folder into the new repository, then add a
   secret `PORTFOLIO_TOKEN` there: a fine-grained token for `portfolio` only, with *Contents* and *Pull requests* read and write.
4. **Published comment.** In the website repository, add a secret `BPSC_SUBMISSIONS_TOKEN`: a fine-grained token for
   `bpsc-submissions` only with *Issues: Read and write* (the token from step 2 can be reused). The website's
   "BPSC published" workflow uses it to comment "Published" with the link and close the issue after a merge (FR-57).
   The daily news job uses it too, to send the AI's possible viva questions here with the label `ai-suggested` (FR-58).

**Every day.** GitHub emails you about each new issue. Close it with `rejected`, or add `approved`: a pull request opens
in the website repository with the exact text, and the BPSC banks check runs on it. Read it, fix anything in the diff,
and merge. The site updates within minutes and the issue is closed with the link.

You can also ask Claude in the project: "process the BPSC submissions". Claude reads the open issues, checks the facts,
writes the items and opens the same kind of pull request (FR-56).

The number of open submissions is never shown on the website (FR-59).
