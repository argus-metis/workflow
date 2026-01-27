---
name: workflow:pull-request
description: Create a pull request for the vercel/workflow repo following conventions
---

# Create Pull Request

Create a pull request for the workflow repository following project conventions.

## Workflow

1. **Check branch state**
   ```bash
   git status
   git diff main...HEAD
   git log main..HEAD --oneline
   ```

2. **Ensure changeset exists** (required for merge)
   ```bash
   # Check if changeset is needed
   pnpm changeset status --since=main >/dev/null 2>&1 && echo "no changeset needed" || echo "changeset needed"

   # Create changeset if needed (patch mode only during beta)
   pnpm changeset

   # For docs/workbench only changes
   pnpm changeset --empty
   ```

3. **Ensure DCO sign-off on commits**
   ```bash
   # Check existing commits for sign-off
   git log main..HEAD --format="%h %s"

   # If commits need sign-off, amend or recommit with --signoff
   git commit --amend --signoff
   ```

4. **Push branch and create PR**
   ```bash
   git push -u origin HEAD
   ```

5. **Create PR with gh CLI using this format:**
   ```bash
   gh pr create --base main --title "<title>" --body "$(cat <<'EOF'
   ### Description

   <1-3 sentence summary of the changes. Include screenshots/videos for UI changes.>

   ### What changed?

   - <bullet point 1>
   - <bullet point 2>

   ### How to test?

   1. <step 1>
   2. <step 2>

   ### Why make this change?

   <brief rationale>

   ### PR Checklist - Required to merge

   - [x] `pnpm changeset` was run to create a changelog for this PR
     - During beta, we only use "patch" mode for changes. Don't tag minor/major versions.
     - Use `pnpm changeset --empty` if you are changing documentation or workbench apps
   - [x] DCO sign-off passes (run `git commit --signoff` on your commits)
   EOF
   )"
   ```

## PR Body Template

```markdown
### Description

<short summary - screenshots/videos welcome for UI changes>

### What changed?

- <change 1>
- <change 2>

### How to test?

1. <test step 1>
2. <test step 2>

### Why make this change?

<rationale for the change>

### PR Checklist - Required to merge

- [ ] `pnpm changeset` was run to create a changelog for this PR
  - During beta, we only use "patch" mode for changes. Don't tag minor/major versions.
  - Use `pnpm changeset --empty` if you are changing documentation or workbench apps
- [ ] DCO sign-off passes (run `git commit --signoff` on your commits)
```

## Title Conventions

- Start with action verb: Add, Fix, Update, Remove, Refactor
- For scoped changes: `[package-name] Description` or `fix(package): description`
- Keep concise but descriptive

Examples from recent PRs:
- `Add 'WORKFLOW_SERVER_URL_OVERRIDE' var to "world-vercel" for testing`
- `fix(builders): manifest missing workflow-only files (no steps), add tests`
- `[web-shared] Tone down colors on event list`
- `Fix 'getWorld()' import naming`

## Changeset Guidelines

- **All code changes**: Run `pnpm changeset` and select affected packages
- **Docs/workbench only**: Run `pnpm changeset --empty`
- **Version mode**: Always use "patch" during beta (never minor/major)
- **Message style**: Keep terse, specific to each modified package
- **Breaking changes**: Mark as "**BREAKING CHANGE**" in the changeset

## Important Notes

- Base branch is always `main`
- Never push directly to `main`
- DCO sign-off is enforced by CI
- Changesets are required for merge
- Include before/after screenshots for UI changes (use markdown tables)
