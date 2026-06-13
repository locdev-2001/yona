# Phase 09 — UI: Settings → Members (invite / role / team)

Priority: P1 · Status: pending · Type: vertical slice (capstone e2e)
BR: X03, X12 · uses MembershipService + spatie sync (phase 04)

## Goal
Admin manages workspace membership: list members, invite by email, set role + primary team (server-controlled), deactivate. Role/team changes never client-trusted; user can't change own role (BR-X12).

## BE
- `app/Services/MembershipService.php`: 
  - `invite(email, role, teamId)`: find-or-create global `User` (status active, no password set → invited flow; v1: create with random password + invited status; full email invite deferred), create `WorkspaceMember` (status invited, role, team in-workspace), sync spatie (`setPermissionsTeamId(ws); user->syncRoles([role])`), audit `member_invite`.
  - `updateRole(member, role)`: guard not self-demote/escalate; reassign spatie roles; audit `role_change`.
  - `updateTeam(member, teamId)`: team in-workspace; audit `team_change`.
  - `deactivate(member)`: BR-X03 — block if member owns open records (no owned business entities yet → no-op check now, leave hook + comment); set status deactivated; audit.
- `app/Http/Controllers/Settings/MemberController.php`: `index`, `store` (invite), `update` (role/team), `destroy` (deactivate). authorize via `WorkspaceMemberPolicy` (admin). 
- Requests validate role ∈ enum, team_id in-workspace, email valid; **role/team taken only from validated body but applied by service** (never mass-assigned onto model — BR-X12). Block acting on own membership for role change.
- Routes under auth+workspace: `GET settings/members`, `POST settings/members`, `PATCH settings/members/{member}`, `DELETE settings/members/{member}`.

## FE
- `resources/js/pages/settings/members.tsx`: table (reuse `Table` / TanStack) of members: name, email, role badge (`StatusBadge`-style via status helper), team, status. Invite dialog (email + role select + team select). Row actions: change role, change team, deactivate (confirm). Labels via `t()`; avatars via existing `user-info`.
- Add "Members" tab to settings layout (admin-only visible).

## Tests
- Pest `MemberManagementTest`: admin invites → membership invited + spatie role assigned (scoped to workspace); update role persists + audited; non-admin invite → 403; **admin cannot change own role** → 403/422; role from body cannot escalate via mass-assign (set unexpected field → ignored); cross-workspace member id → 404; same user different role in 2 workspaces resolves independently.
- Playwright `e2e/settings-members.spec.ts` (**capstone**): login admin → invite member with role sales_rep + team → appears in list with correct role. Combined flow also covers switch-workspace (phase 06) + create-team (phase 08) prerequisites.

## Success criteria
- Invite/role/team server-controlled + audited; self-role change blocked; per-workspace role isolation proven; capstone e2e green.
- design-system grep clean. 

## Module 1 DONE when: all phase tests + e2e green · pint + larastan + tsc + build green · docs synced (Phase 4 docs-manager).
