# Phase 07 — UI: Settings → Workspace

Priority: P1 · Status: pending · Type: vertical slice
BR: X12 · admin-gated · REUSE settings layout

## Goal
Admin edits the active workspace: name, base_currency, timezone, locale, audit_retention.

## BE
- `app/Http/Controllers/Settings/WorkspaceController.php`: `edit` (render), `update`.
- `app/Http/Requests/Settings/WorkspaceUpdateRequest.php`: `authorize()` → `Gate::allows('update', currentWorkspace())` (WorkspacePolicy admin). Rules: name required; base_currency in ISO list; timezone in `timezone_identifiers_list()`; locale in [vi,en]; audit_retention in [30d,90d,1y,forever].
- Route in `routes/settings.php` under auth+workspace: `GET settings/workspace` (name `workspace.edit`), `PATCH settings/workspace` (`workspace.update`).
- Update via fillable-safe assignment (no workspace_id change). Audited (Auditable on Workspace from phase 05).

## FE
- `resources/js/pages/settings/workspace.tsx` using `settings/layout` + `<Field>`/shadcn inputs + `Select` for currency/timezone/locale/retention. `useForm` (Inertia) for submit; show validation errors. All labels via `t()`.
- Add "Workspace" tab to `layouts/settings/layout.tsx` nav (alongside Profile/Password/Appearance) — gate visible only to admins (membership.role==='admin'); **security still in Policy** (FE hide is cosmetic).

## Tests
- Pest `WorkspaceSettingsTest`: admin can view+update; non-admin (viewer) update → 403; invalid currency → 422; update writes audit row; base_currency persists.
- Playwright `e2e/settings-workspace.spec.ts`: login as admin → settings/workspace → change name → save → success toast + persisted.

## Success criteria
- Admin-only enforced server-side; valid update persists + audited; e2e green.
- design-system §7.6 grep clean on changed FE files.
