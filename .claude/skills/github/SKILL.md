---
name: github
description: Use when asked to open, update, review or merge a pull request, to create, read or close an issue, or for anything else on GitHub through the gh CLI.
---

# GitHub

Run `gh auth status` first; when it fails, stop and pass its message to the user.

## Rules

- Write titles, bodies and comments in English.
- Never force-push, delete branches or edit repo settings unless the user asks.

## Pull requests

Open PRs only from `dev` to the default branch, `<base>` below: `git fetch`, then `git symbolic-ref --short refs/remotes/origin/HEAD` (prints `origin/<base>`). Push `dev` first.

- Title: plain. With one commit in `git log origin/<base>..dev`, its commit message; with more, a short summary of them.
- Body: the list of commit messages from `git log origin/<base>..dev --reverse --format="- %s"`.
- After merging, bring the merge commit back to `dev` without a PR: `git fetch`, then on `dev` `git merge --ff-only origin/<base>` and `git push origin dev`. When the fast-forward fails (`dev` got new commits meanwhile), stop and ask the user.

```bash
gh pr list --state open
gh pr create --base <base> --head dev --title "<title>" --body-file <file>
gh pr view <number> --json title,body,state,mergeable,statusCheckRollup
gh pr diff <number>
gh pr merge <number> --merge|--squash|--rebase
```

## Issues

Issues hold the tasks to do: features, bugs, chores.

- ID: the GitHub issue number, `#<number>` within the repo, `<repo>#<number>` across repos
  (`amazon-server#12`). Refer to tasks only by it.
- Type: label `bug` or `feature` (`gh label list` for others).
- Title: a short description of what to do, starting with a verb (`Add ...`, `Fix ...`).
- A PR that finishes a task gets `Closes #<number>` under the commit list in its body.
- Body: the sections below.

### Body

```markdown
## What

<the change and its rules, 1–3 sentences>

## Where

- `<path>:<line>` – <what changes there>.
- <places that stay unchanged, when one could expect a change>.
- `.claude/rules/...` and `CLAUDE.md` – <docs to update>.

## Done when

- <endpoint or behaviour that can be checked>.
- Unit and integration tests are updated; coverage thresholds still pass.
```

### Flow

1. The user gives a topic and asks to create an issue.
2. Analyse the topic in the code: every place the change reaches.
3. Propose the title, label and body in the chat.
4. Ask about open design decisions.
5. After every change (design answers, corrections), show the full proposal again: title, label and body.
6. Create the issue only after the user explicitly accepts the latest proposal. Answers to design questions are not acceptance.

```bash
gh issue list --state open
gh issue view <number> --comments
gh issue create --title "<title>" --body-file <file> --label <label>
gh issue comment <number> --body-file <file>
gh issue close <number> --comment "<reason>"
```

## Other repos

Add `--repo <owner>/<name>` to any command; `gh repo list <owner>` lists them.
