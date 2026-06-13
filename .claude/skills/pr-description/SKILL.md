---
name: pr-description
description: Generate PR description with Release Note format from git diff. Auto-detect scope (BE/FE), migrations, version, rollback info. Use when creating PRs or writing release notes.
---

# PR Description Generator

Generate structured PR descriptions with Release Note format by analyzing git changes.

## Workflow

1. Analyze git diff between current branch and target branch (default: `main`)
2. Auto-detect scope, migrations, and changes
3. Generate formatted PR description
4. Update PR description on GitHub automatically via `gh pr edit`

## Arguments

- No arguments: analyze current branch's PR against `main`
- `check pr <number>`: analyze an existing PR by number (e.g., `check pr 4035`)

## Steps

### 1. Gather Git Data

**For current branch (no arguments):**
```bash
git branch --show-current
git diff main...HEAD --stat
git diff main...HEAD --name-only
git log main...HEAD --oneline --no-merges
git describe --tags --abbrev=0 2>/dev/null || echo "no tags"
git diff main...HEAD --name-only | grep "database/migrations/"
```

**For existing PR (`check pr <number>`):**
```bash
gh pr view <number> --json title,body,headRefName,baseRefName,commits,files,state
git describe --tags --abbrev=0 2>/dev/null || echo "no tags"
```

### 2. Auto-Detect Fields

- **Scope**: Detect from changed files — see `references/scope-detection.md`
- **Version**: From latest git tag, increment patch. If no tags, ask user
- **Migration**: Scan for new files in `database/migrations/`
- **Rollback version**: Previous git tag
- **Release date**: Today's date in DD/MM/YYYY format

### 3. Categorize Changes

Group commit messages into categories:
- **Feature**: New functionality (add, create, implement)
- **Fix**: Bug fixes (fix, resolve, patch)
- **Optimize**: Performance improvements (optimize, improve, refactor)
- **Chore**: Maintenance (chore, update, upgrade)

### 4. Generate & Update PR

Use template from `references/template.md`. Fill all sections with detected data.

If uncertain about Overview or Notes, ask user for context.

**After generating, automatically update the PR on GitHub:**
```bash
# For current branch PR
gh pr edit --body "$(cat <<'EOF'
<generated description>
EOF
)"

# For specific PR number
gh pr edit <number> --body "$(cat <<'EOF'
<generated description>
EOF
)"
```

Always update the PR description directly — do NOT just output to terminal.

## Important Rules

- Always analyze ALL commits between branches, not just the latest
- Migration section: show "Migration not required" if no migration files found
- Notes section: include migration/queue restart reminders if applicable
- Language: Mix Vietnamese + English is OK (match the team's style)
- Rollback DB: "Yes" only if migrations exist
