---
name: fable-playbook
description: Use at the start of any non-trivial task (multi-step change, bug fix, feature, refactor, investigation) and again before claiming work is done. Covers how to plan, how to break work into steps, and how to check your own work.
---

# Fable Playbook

A working method for planning, decomposing, and verifying tasks. Follow it in order. Scale each phase to the task: a one-line fix needs seconds of planning, a feature needs real planning.

## 1. Understand before planning

1. Restate the request in one sentence. If you cannot, you do not understand it yet.
2. Define "done" as something observable: a test passes, a page renders, a command prints X. Write it down before touching code.
3. Read the instructions that bind you first: `AGENTS.md`, `CLAUDE.md`, the user's message. In this repo, `AGENTS.md` says the Next.js version differs from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code. Do not trust memory for framework APIs.
4. Look at the real code before forming an opinion. Find the files involved, read the ones you will change, and find one existing example of the pattern you are about to write. Copy the local convention, not your default.
5. Separate what you know from what you assume. Every assumption that would change the plan gets checked now (read the file, run the command) and not later.
6. Ask the user only when the answer changes what you do and you cannot find it in the request, the code, or a sensible default. Otherwise pick the obvious option, say which you picked, and continue.

## 2. Plan

1. Pick the smallest change that meets the "done" definition. Reject scope the user did not ask for: no drive-by refactors, no extra features, no new documents.
2. Find the riskiest part (the unknown API, the unclear data shape, the step that cannot be undone) and plan to resolve it first. A plan that leaves the hard part for last fails late.
3. Choose one approach. If two are plausible, compare them on one or two concrete criteria, decide, and move on. Do not carry both.
4. Decide how you will verify each part before you build it. If you cannot name the check, the step is not well defined.
5. Identify anything irreversible or outward-facing (deleting data, force-pushing, running migrations on a live database, sending messages, deploying). These need the user's confirmation; plan around them.

## 3. Break into steps

1. Each step produces one verifiable result. "Add the column and the migration, confirm the migration runs" is a step. "Work on the backend" is not.
2. Order steps by dependency, with the riskiest early. Prefer vertical slices (one thin path working end to end) over finishing whole layers one at a time.
3. Keep steps small enough that a failure points at one cause. If a step touches more than a few files, split it.
4. For tasks with three or more steps, keep a task list and update it as you go. Mark a step complete only after its check passes.
5. Run independent reads and searches in parallel. Run dependent actions in sequence.
6. When reality contradicts the plan, stop and re-plan. Do not force the original plan through evidence that it is wrong.

## 4. Execute

1. Change one thing, check it, then change the next. Do not stack several unverified edits.
2. When something fails, read the actual error text. Form one hypothesis about the cause, test it with the cheapest possible check, then fix. Do not guess-and-retry, and do not fix symptoms (no silenced errors, no skipped tests, no loosened types to get green).
3. If the same approach fails twice, the model of the problem is wrong. Go back to reading, not to a third variation.
4. Ordinary obstacles (timeouts, missing tools, empty results) are to be diagnosed and worked through. Deliberate blocks (denied permissions, protected files, safety rules) are to be respected and reported.
5. Stay inside the task. Note unrelated problems you find and report them at the end; do not fix them unasked.

## 5. Check your own work

Do this before saying anything is done. Evidence first, then the claim.

1. Run the check you defined in step 1 and read its full output. "It should work" is not a result.
2. Run the project's own gates for what you touched: type check, lint, tests, build. Read `package.json` scripts to find the real commands.
3. For UI or behavior changes, exercise the real thing (run the app, load the page, take a screenshot), not only the tests.
4. Re-read your full diff as a reviewer would. Look for: leftover debug code, unrelated changes, broken edge cases (empty, null, error path), names that do not match local convention, and anything the request asked for that the diff does not contain.
5. Re-read the original request one more time and compare it line by line against what you delivered. Missed requirements hide here.
6. Check that you did not break the neighbors: callers of functions you changed, other uses of types or components you edited.

## 6. Report

1. Lead with the outcome: what now works, or what does not.
2. State exactly what was verified and how, and what was not verified. If tests fail, say so and show the decisive line. If a step was skipped, say so.
3. Flag decisions you made on the user's behalf and anything that needs their action.
4. Keep it short. No recap of the process unless asked.

## Quick checklist

- [ ] "Done" defined as an observable result
- [ ] Binding instructions and relevant code read; framework docs checked instead of memory
- [ ] Smallest sufficient change chosen; riskiest part first
- [ ] Steps are small, ordered, each with its own check
- [ ] Each step verified before the next
- [ ] Full verification run and output read
- [ ] Diff re-read; request re-read
- [ ] Report states what was and was not verified
