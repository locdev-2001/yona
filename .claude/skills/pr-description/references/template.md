# PR Description Template

Output this exact format, replacing `{{placeholders}}`:

```markdown
## Release Note

- Release date: {{DD/MM/YYYY}}
- Version: {{version}}
- Environment: Production
- Scope: {{BE | FE | BE + FE}}
- Device: {{Backend API | Frontend Web | Backend API + Frontend Web}}

### Overview
{{1-2 bullet points summarizing the changes in Vietnamese or English}}

### Changes
{{List each change as a bullet point, grouped by category}}

### Migration
{{If migrations exist:}}
- Migration required
- Script: {{migration file path(s)}}
- Affected table: {{table name(s)}}

{{If no migrations:}}
- Migration not required

### Rollback
- Revert version: {{previous version/tag}}
- DB rollback: {{Yes (rollback migration above) | No}}

### Notes
{{Operational notes, e.g.:}}
- Chạy migrate trước khi restart queue worker.
- Clear cache sau khi deploy.
{{Or "None" if nothing special}}
```

## Field Mapping

| Field | Source | Example |
|-------|--------|---------|
| Release date | Today | 14/01/2026 |
| Version | Latest tag + increment | 2.1.0 → 2.1.1 |
| Scope | Changed file paths | BE if only `app/`, FE if only `resources/js/` |
| Device | Derived from Scope | BE → Backend API |
| Overview | Summarize commits | Tối ưu query và fix lỗi chat |
| Changes | Commit messages | - Fix lỗi duplicate message |
| Migration | `database/migrations/` | Script path + table name |
| Rollback version | Previous tag | 2.0.9 |
| DB rollback | Has migrations? | Yes/No |
| Notes | Context-dependent | Migration/cache/queue reminders |
