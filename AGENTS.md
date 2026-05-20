# Repository Workflow

Use this loop for each work iteration:

1. Read the next task from `tasks.md` and check the relevant app files before deciding on implementation details.
2. Make a short plan that names the expected behavior, the files likely to change, and the checks needed for confidence.
3. Write or identify tests first when the change affects behavior. For this static app, use focused browser checks and any available script checks; add automated tests if a test harness is introduced.
4. Develop the smallest coherent change that completes the task, following the existing vanilla HTML, CSS, and JavaScript patterns in `index.html`.
5. Check `git status --short` before editing and again before committing so unrelated user changes stay visible.
6. Run the relevant checks. At minimum, load the app through a local static server and verify the changed user flow; also run `node scripts/validate-data.js` and any other test, lint, or validation command that exists in the repo.
7. Review the diff for unrelated edits, stale copy, layout regressions, README accuracy, and task-list accuracy. Update `tasks.md` when a task is completed or reprioritized.
8. Commit with a clear message that describes the user-facing change.
9. Push the branch after the commit succeeds for small scoped tasks. For larger behavior or data changes, prefer a PR/review step before pushing unless the user explicitly asks to push.

Definition of done:

- The requested task is reflected accurately in `tasks.md`.
- The changed user flow is verified through a local static server.
- `node scripts/validate-data.js` passes.
- README instructions match the current run and check workflow.
- `git diff` contains no unrelated edits.

Keep changes scoped to the current task. Do not mix data-import work, UI redesign, and infrastructure changes in one commit unless the task explicitly requires it.
