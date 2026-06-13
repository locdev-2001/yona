# Phase 06 — UI: app shell + workspace switch + user menu + i18n wiring

Priority: P1 · Status: pending · Type: vertical slice (BE+UI)
BR: X14 · Arch §9b · design-system §1/§8/§9/§10 · REUSE existing shell

## Goal
Wire the existing app-shell/sidebar to real workspace data; server-side workspace switching; locale switch in user menu; Inertia shared props + FE `t()` helper. **Reuse** app-sidebar/workspace-switcher/nav-user — do not rebuild.

## BE
- `HandleInertiaRequests::share()` add:
  - `auth.user` (id,name,email,avatar,locale,timezone,is_internal).
  - `auth.membership`: `{ role, team_id, permissions: [...] }` for active workspace (from currentMembership + spatie `getAllPermissions` within team context). null on non-workspace pages.
  - `auth.workspaces`: list of user's active memberships → `[{id,name,slug,role}]` (for switcher).
  - `activeWorkspace`: `{id,name,slug,base_currency,timezone,locale}` or null.
  - `locale`: app locale; `i18n`: merged `lang/{locale}.json` + flattened `lang/{locale}/*.php` (cached). 
  - keep existing `name`,`quote`. Guard: only compute workspace props when `currentWorkspace()` bound.
- Route `POST workspaces/{workspace}/switch` → `WorkspaceSwitchController`: validate the workspace is in `$user` active memberships (else 403 — BR-X14 server-validated), `session(['current_workspace_id'=>$workspace->id])`, redirect back. (id from route is validated against memberships, never trusted blindly.)
- `PUT /locale` already added (phase 05) — ensure shared `locale` updates on reload.

## FE
- `resources/js/lib/i18n.ts`: `t(key, params?)` reading `usePage().props.i18n`; ICU-ish `:param` replace; fallback to key. (No new dep — tiny helper.)
- `resources/js/types/index.ts`: add `Workspace`, `Membership` types; extend `SharedData` (workspaces, activeWorkspace, membership, locale, i18n). User.id stays `number`.
- `workspace-switcher.tsx`: replace mock with `usePage().props.auth.workspaces` + `activeWorkspace`; clicking a workspace `router.post(route('workspaces.switch', ws.id))`; "Add workspace" stays disabled (later). Use `t()` for labels.
- `user-menu-content.tsx`: add **language switcher** (vi/en) → `router.put(route('locale'), {locale})`; keep appearance + logout. Use `t()`.
- `app-sidebar.tsx` nav: keep groups; gate items by permission later (foundation only needs Dashboard + Settings). Add Settings group linking workspace/teams/members (built in 07–09) — can stub links now, pages land next phases.
- Replace hard-coded strings in shell components with `t()` (design-system non-negotiable §6/§10).

## Tests
- Pest `WorkspaceSwitchTest`: switching to a workspace the user belongs to sets session + 200; switching to a foreign workspace → 403; shared props expose only the user's workspaces.
- `tsc` + `pnpm build` green.

## Success criteria
- Switcher shows real workspaces; switching changes activeWorkspace after reload; foreign switch blocked.
- Locale switch persists + flips UI strings.
- No raw hex / hard-coded user-facing strings in changed components (design-system §7.6 grep).

## Notes
- Seed at least one workspace + membership for the 2 existing users (a one-off idempotent `FoundationSeeder`) so the logged-in user has a workspace context. Run via `db:seed` (no data loss).
