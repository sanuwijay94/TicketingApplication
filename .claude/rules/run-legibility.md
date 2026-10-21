# Run Legibility

How a session reports on itself so that a human who is **not watching** can tell what it is
doing, what it did, and what it needs. This applies to every session, and it is binding for
unattended runs (CI jobs, the `sukitha/ai-factory` pipeline), where the status surface is the
only window anyone has into the work. The factory's heartbeat reads exactly what this rule
tells you to emit.

## The four principles

1. **Narrate state transitions, not actions.** Report when the work changes phase
   (*planning → implementing → verifying → done / blocked*), what the phase achieved, and what is
   next — not each file read or command run. "Implementing: 3/5 files done, tests red on
   `test_status.py`" is a status; a list of twelve edits is a log.
2. **Evidence over claims.** "Tests pass" is a claim. The pasted last lines of the test run, the
   exit code, the screenshot of the state, the check-run link — those are evidence. Never
   report a result you did not observe; if you could not run something, say so explicitly
   (`ui-quality.md` already demands this for UI work).
3. **One status surface per run.** A run reports to **one** place — the PR body or the single
   status comment the factory maintains — and *updates it in place*. Detail goes to artifacts
   (transcript, tool log, screenshots), referenced from the surface. Chat-spam from agents is the
   failure mode to design against: an issue thread with forty agent comments is unreadable.
4. **Escalate loudly, progress quietly.** A working run never pings anyone. A blocked run —
   a hook refused an action, a gate needs approval, a confidence check failed, the budget is
   gone — changes its status to `⛔ blocked: <reason> → <route to resolution>` and stops. It does
   not look for a way around the block.

## Stage markers (unattended runs)

When running headless, emit a single line at every phase change so the run wrapper can parse it:

```
::stage::planning
::stage::implementing
::stage::verifying
::stage::done
::stage::blocked <one-line reason>
```

Nothing else goes on those lines. Emit them in order; emit `blocked` at most once and then stop.

## Status format

```
**Stage**: <planning | implementing | verifying | done | blocked>
**Progress**: <one line — what is done, what is next>
**Evidence**: <test summary line / screenshot refs / check-run link — or "none yet">
**Needs**: <nothing | approval of X by Y | engineer decision on Z>
```

## Always

- Report every phase change in the status format above
- Paste the literal evidence (last lines of test output, exit codes, screenshot paths) before
  saying anything is done or working
- State plainly when something was not run or could not be verified
- Update the existing status surface rather than adding a new message
- On a block: name the blocker, the reason, and the person or route that can unblock it; then stop

## Never

- Claim a result you did not observe
- Post progress as a stream of separate messages or comments
- Work around a hook, gate, or permission denial — a block is information for a human
- Report "done" without the evidence named in the plan's *Proof* section (`PLAN-NNN`)
- Interrupt a human during a build phase with a question that can wait for the gate

## Ask First

- Changing the stage-marker vocabulary — the factory's run wrapper parses it
- Adding a second status surface for a run (e.g. a Slack post *and* a PR comment)
