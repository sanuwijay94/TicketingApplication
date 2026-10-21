# Branch Isolation

## Always

- When asked to work on a different branch or PR, **ask first**: "This will need a different branch. Shall I create a worktree so your current work stays untouched, or do you want to stash and switch?"
- For read-only inspection (review, diff, reading files), prefer `git show <branch>:<path>` or `git diff <branch>` — no worktree needed, no need to ask
- After worktree work is complete, ask the user: "Worktree at `<path>` is no longer needed — shall I clean it up?" Then run `git worktree remove <path>`

## Never

- Run `git checkout` or `git switch` to another branch when there are uncommitted or staged changes
- Leave worktrees behind without offering cleanup — stale worktrees waste disk and cause confusion

## Workflow

1. **Need to read another branch?** → `git show` or `git diff` (no worktree needed)
2. **Need to make changes on another branch?** → `git worktree add ../<project>-<branch> <branch>`, work there, then offer cleanup
3. **Spawning an agent for cross-branch work?** → use `Agent(isolation: "worktree")` — cleanup is automatic if no changes are made
4. **Returning from worktree work?** → always offer to remove the worktree: `git worktree remove <path>`
