# Repository Workflow

Use this loop for each work iteration:

1. Read the next task from `tasks.md` and check the relevant app files before deciding on implementation details.
2. Make a short plan that names the expected behavior, the files likely to change, and the checks needed for confidence.
3. Write or identify tests first when the change affects behavior. For this static app, use focused browser checks and any available script checks; add automated tests if a test harness is introduced.
4. Develop the smallest coherent change that completes the task, following the existing vanilla HTML, CSS, and JavaScript patterns in `index.html`.
5. Run the relevant checks. At minimum, load the app through a local static server and verify the changed user flow; also run any test, lint, or validation command that exists in the repo.
6. Review the diff for unrelated edits, stale copy, layout regressions, and task-list accuracy. Update `tasks.md` when a task is completed or reprioritized.
7. Commit with a clear message that describes the user-facing change.
8. Push the branch after the commit succeeds.

Keep changes scoped to the current task. Do not mix data-import work, UI redesign, and infrastructure changes in one commit unless the task explicitly requires it.
