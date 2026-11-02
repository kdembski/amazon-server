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

Open PRs only from `dev` to `master`. Push `dev` first.

- Title: plain. With one commit in `git log master..dev`, its commit message; with more, a short summary of them.
- Body: the list of commit messages from `git log master..dev --reverse --format="- %s"`.
- After merging run `git fetch`.

```bash
gh pr list --state open
gh pr create --base master --head dev --title "<title>" --body-file <file>
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
- Body: a longer description: what and why, where (`file:line`, endpoint, logs), and when it is done.
- A PR that finishes a task gets `Closes #<number>` under the commit list in its body.

```bash
gh issue list --state open
gh issue view <number> --comments
gh issue create --title "<title>" --body-file <file> --label <label>
gh issue comment <number> --body-file <file>
gh issue close <number> --comment "<reason>"
```

## Other repos

Add `--repo <owner>/<name>` to any command; `gh repo list <owner>` lists them.
