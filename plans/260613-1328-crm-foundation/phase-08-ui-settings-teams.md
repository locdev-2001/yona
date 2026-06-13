# Phase 08 — UI: Settings → Teams (CRUD tree)

Priority: P1 · Status: pending · Type: vertical slice
BR: X02, X12, X13 · uses TeamService + closure (phase 04)

## Goal
Admin manages the workspace team hierarchy: create, rename, reparent (cycle-guarded), delete (soft). Tree UI.

## BE
- `app/Http/Controllers/Settings/TeamController.php`: `index` (tree), `store`, `update` (rename), `reparent`, `destroy`.
- Requests: `TeamStoreRequest` (name required, parent_id nullable + must be in-workspace team — BR-X11), `TeamUpdateRequest`, `TeamReparentRequest` (parent_id in-workspace, not self/descendant).
- All `authorize` via `TeamPolicy` (admin only). Mutations through `TeamService` (closure maintenance + cycle guard from phase 04); audited (`team_change`).
- Routes under auth+workspace: `GET settings/teams`, `POST settings/teams`, `PATCH settings/teams/{team}`, `PATCH settings/teams/{team}/reparent`, `DELETE settings/teams/{team}`. Single-record fetch scoped → 404 if foreign (BR-X15).
- `index` returns nested tree (build from flat teams + parent_id, or closure) + member counts per team.

## FE
- `resources/js/pages/settings/teams.tsx`: tree view (indented list using existing `collapsible`/`sidebar` primitives or a simple recursive `<TeamNode>`). Actions per node: rename (dialog), add child (dialog), reparent (select parent), delete (confirm dialog). Reuse `Dialog`, `Button`, `Input`, `Select`. Labels via `t()`.
- Add "Teams" tab to settings layout (admin-only visible).
- Optimistic-lock aware: surface 409 (StaleModelException) as a toast "reload".

## Tests
- Pest `TeamCrudTest`: admin create root + child → closure rows correct; rename; reparent valid → subtree depths update; reparent into descendant → 422 (cycle guard); delete soft-hides; non-admin → 403; cross-workspace team id → 404.
- Playwright `e2e/settings-teams.spec.ts`: login admin → create a team → appears in tree.

## Success criteria
- Tree CRUD works; cycle guard + closure correct; admin-gated; e2e create-team green.
- design-system grep clean.
