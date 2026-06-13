# Code Review — Module 1 Platform Foundation (tenant isolation + RBAC)

Date: 2026-06-13 · Reviewer: code-reviewer (adversarial security pass)
Scope: `git diff 52c27c9..HEAD` — 3-layer isolation, RBAC/visibility, audit/concurrency, mass-assignment, UI controllers.
Baseline: 64 platform tests PASS, Larastan clean, Pint not run.

## Verdict on the four attack goals

| Goal | Result |
|---|---|
| (a) Read/write across workspaces | **No working bypass found** via Eloquent or raw SQL given correct per-request context. RLS (FORCE, non-superuser app role) holds. BUT a cross-request context-leak (C2) can read another workspace's data under Octane/PgBouncer/persistent-PDO topologies. |
| (b) Escalate role/visibility | **No** in-workspace self-escalation path found. Guards are layered (policy + controller self-check + `$guarded=['*']`). One theoretical write-side note in H3. |
| (c) Mutate/delete audit rows | **No** — blocked at both model and DB-grant layer (proven by test + live probe). |
| (d) Bypass the cycle guard | **No** — guard is checked in FormRequest AND TeamService; closure rebuild is correct. |

Net: the design is sound and genuinely defense-in-depth. The blocking issues are (1) a functional break in platform-plane audit, and (2) a latent isolation leak that becomes exploitable under common production deployment topologies.

---

## CRITICAL

### C1 — Platform-plane (NULL-workspace) audit writes are impossible; BR-X05 login/security audit silently broken
- `database/migrations/2026_06_13_100009_enable_rls_on_tenant_tables.php:19-36` — `audit_logs` is in the RLS table list with `WITH CHECK (workspace_id = nullif(current_setting('app.current_workspace',true),'')::uuid)`.
- `database/migrations/2026_06_13_100007_create_audit_logs_table.php:17` makes `workspace_id` nullable *"for platform-plane events (login)"*, and BR-X05 mandates auditing login / role / export / erasure / impersonation — many of which occur with no workspace context.
- `app/Support/Audit/Audit.php:24-37` writes via `AuditLog::query()->forceCreate()` on the **default (app-role)** connection — NOT the privileged connection the docblocks at `Audit.php:10-12`, `AuditLog.php:11-12`, and the audit migration comment all claim.
- **Proven:** with no/empty workspace context, `INSERT ... workspace_id = NULL` into `audit_logs` is rejected: `SQLSTATE[42501] ... new row violates row-level security policy`.
- **Risk:** any future login/security audit attempt either throws (500) or is silently lost depending on call site. There is currently NO code path that can write a platform-plane audit row.
- **Fix (pick one):**
  - Route platform-plane audit inserts through `DB::connection('pgsql_privileged')` (matches the documented intent — the privileged owner bypasses RLS). Make `Audit::log()` select the connection based on whether `workspace_id` is null, OR always use privileged for audit and rely on the grant (INSERT-only) for immutability. *Note:* if you keep app-role writes you LOSE the privileged-write claim in the docblocks — either way, update the now-false comments.
  - OR add a permissive RLS clause on `audit_logs` allowing `workspace_id IS NULL` rows (weaker — lets the app role insert arbitrary NULL-workspace rows; privileged-connection routing is cleaner and matches the stated design).
- **Test gap:** no test inserts a NULL-workspace audit row (e.g. a `login` event). `AuditLogTest.php` only exercises workspace-scoped Team audits, so this is invisible to CI. Add a failing-first test for a platform-plane event.

---

## HIGH

### H1 — RLS session context leaks across requests on a shared connection (latent cross-tenant read)
- `app/Http/Middleware/IdentifyWorkspace.php:34,49`, `HandleInertiaRequests.php:92`, `WorkspaceSwitchController.php:23` all use `set_config('app.current_workspace'|'app.current_user_id', ?, false)`. The third arg `false` = **session-level** (persists for the DB connection's lifetime), and the context is **never reset at request end**.
- **Proven:** `set_config(...,false)` survives a transaction rollback AND survives into a subsequent statement on the same connection (live probe: request B saw request A's leaked `workspace=...` and `user_id=42`).
- **Impact today:** with stock PHP-FPM (fresh non-persistent PDO per request) the connection is torn down per request, so it is NOT currently exploitable. It becomes a real cross-tenant read the moment the app runs under **Laravel Octane**, **PgBouncer (session/transaction pooling)**, or `PDO::ATTR_PERSISTENT`. `laravel/octane ^2.15` already appears in `composer.lock`. A request that does NOT pass `IdentifyWorkspace` (e.g. `/settings/profile`, `/settings/password`, `/locale`, `/` — all auth-only, no `workspace` mw) would inherit the *previous* request's tenant context; any workspace-scoped query there reads the prior tenant's rows.
- **Why it matters for `app.current_user_id` specifically:** the `workspace_member` policy (`refine_workspace_member_rls_policy`) exposes `user_id = app.current_user_id` rows across ALL workspaces. A leaked `current_user_id` lets the next request on that connection read the previous user's memberships in every workspace.
- **Fix:** register a `terminating`/`after-response` reset that runs `set_config('app.current_workspace','',false)` + `set_config('app.current_user_id','',false)` (and `setPermissionsTeamId(null)`) at the end of every request — mirror exactly what `TestCase::setUp()` already does defensively for tests. Alternatively set context with `set_config(...,true)` (transaction-local) and wrap request work in a transaction, but the explicit terminating-reset is simpler and topology-independent. Also: add `IdentifyWorkspace` (or an explicit reset) to the auth-only settings group so those routes can't run with stale tenant context.
- **Test gap:** no test simulates request-N-then-request-N+1 on a reused connection. Hard to test under FPM; at minimum assert the terminating reset clears both settings.

### H2 — `app.current_user_id` is set to the caller's id on routes the user fully controls; combined with H1 it widens the leak surface
- `WorkspaceSwitchController.php:23` and `HandleInertiaRequests.php:92` set `app.current_user_id` on every authenticated request (switch runs on the bare `auth` group, no `workspace` mw). This is correct for the self-membership lookup, but it means the leak-prone setting (H1) is established very early and on near-every request. Not a vuln on its own; it is the multiplier that makes H1's blast radius "every request" rather than "only workspace routes". Fix is the same terminating-reset from H1.

### H3 — Audit on `Workspace` create is unreachable, and audit `workspaceId()` can mis-attribute
- `app/Models/Workspace.php:36-40` only audits `updated`/`deleted` (creation is "a platform action without a workspace context"), but `Audit::workspaceId()` for a `Workspace` returns `$model->getKey()` (the workspace's own id) — fine. However for a NULL-workspace model where `workspace_id` attribute is absent, it falls back to `currentWorkspace()?->id` (`Audit.php:49`), which under H1's stale context would stamp the audit row with the **previous request's** workspace. Low likelihood but a data-integrity hole that disappears once H1 is fixed. Flagging the dependency.

---

## MEDIUM

### M1 — Docblocks materially contradict the code (audit connection)
- `Audit.php:10-12`, `AuditLog.php:11-12`, `create_audit_logs_table.php:10` all state audit writes use the **privileged** connection. The code uses the default app-role connection. This is the kind of false comment that causes a future dev to "fix" the wrong thing. Either change the code (preferred, see C1) or correct every comment. Immutability today rests ONLY on the `REVOKE UPDATE,DELETE` grant (`setup-roles.sql:44`) — which is good and proven — but the "separated privilege / privileged connection" story in the docs is fiction.

### M2 — `setup-roles.sql` audit REVOKE is order-dependent and silently no-ops on a fresh DB
- `setup-roles.sql:40-47` only `REVOKE UPDATE, DELETE ON audit_logs` *if the table already exists*. On a fresh bootstrap (roles created before migrations), this block does nothing, and the script comment says "run on BOTH databases" once. If an operator runs `make db-roles` before migrating, audit immutability is NOT enforced until the script is re-run. Tests pass because the test DB was already migrated. **Fix:** add a post-migrate hook (or migration step) that re-applies the REVOKE, or document/automate "run setup-roles AFTER migrate". The `ALTER DEFAULT PRIVILEGES` (line 33-36) re-grants UPDATE/DELETE on future tables to the app role — so even after a manual REVOKE, a later `migrate:fresh`-style recreate of audit_logs would re-grant mutation rights. Consider excluding audit_logs from default privileges or making the REVOKE part of the audit-table migration itself.

### M3 — `MembershipService::invite` leaks global user existence + creates accounts cross-workspace
- `MembershipService.php:31-34` does `User::firstOrCreate(['email'=>...])`. Users are global (no RLS), so an admin in workspace A inviting `victim@corp.com` will silently attach to an existing global user from workspace B (intended — users are global identities), but there is no signal/consent. More importantly, repeated invites let an admin **enumerate which emails already have accounts** (firstOrCreate vs create timing / subsequent membership behavior). Low severity for an internal CRM but worth a note for BR-X07/PII posture. No fix required for Module 1; flag for invite-flow hardening.

### M4 — `Visibility::scopeFor` 'team' level ignores `owner_id` and NULL `team_id` rows
- `Visibility.php:58-62` — 'team' managers are scoped purely by `whereIn(team_id, subtree)`. Records with `team_id = NULL` (owner has no team) are invisible to managers even if owned by a direct report, and a record owned by a rep but tagged to a team outside the manager's subtree is hidden (correct per BR-X02 "team subtree"). This matches the documented rule (team-based, not owner-based rollup) but is a common source of "why can't my manager see this" bugs. Confirm with product that team-tag — not owner's-team — is the intended pivot. No code change if intended; document the edge in the feature doc.

---

## LOW

### L1 — `IdentifyWorkspace` falls back to "earliest active membership" silently
- `IdentifyWorkspace.php:79` `->oldest()->first()` picks an arbitrary (creation-order) workspace when the session has none. Benign, but means a freshly-authenticated user with multiple workspaces lands in a non-deterministic one. Consider a user-level `default_workspace_id`.

### L2 — `HandleInertiaRequests::membershipPayload` ships full permission list to the client every request
- `HandleInertiaRequests.php:125` `$user->getAllPermissions()->pluck('name')`. Fine for gating UI, but it's an N-query per request (spatie cache mitigates) and exposes the permission catalog. Acceptable; note for perf later.

### L3 — `WorkspaceController::update` has no null-guard on `currentWorkspace()`
- `WorkspaceController.php:42-44` calls `$workspace->fill(...)` directly. Safe today because the route carries `workspace` middleware (context always bound), but a defensive `abort_unless($workspace, 403)` mirrors the `edit()` method and is cheap insurance.

### L4 — `WorkspaceSwitchController` uses `withoutGlobalScope` + manual RLS user-context but no workspace context
- `WorkspaceSwitchController.php:23-29` sets only `app.current_user_id` (not `app.current_workspace`) and drops the global scope. Correct (the self-membership RLS clause covers it), but it leaves `app.current_workspace` at whatever the previous request set — see H1. Same terminating-reset fixes it.

---

## Things that are RIGHT (verified, not assumed)
- App role is non-superuser, non-`bypassrls`; `FORCE ROW LEVEL SECURITY` on all tenant tables — RLS genuinely binds (live-probed).
- `WITH CHECK` blocks cross-workspace INSERT (proven by `RlsBypassTest` + the test passes).
- `workspace_member` self-read exception is read-only via `USING (... OR user_id = uid)`; **WRITE side is strict** `WITH CHECK (workspace_id = ws)` — a user cannot insert a self-membership into an arbitrary workspace. No privilege-escalation via the RLS exception.
- Mass-assignment: `WorkspaceMember $guarded=['*']` throws on fill; `Team` only `name` fillable; `User` excludes `status`/`is_internal`. Smuggled `workspace_id` on create is ignored and the active one stamped. All proven by `MassAssignmentGuardTest`.
- Self-role-change blocked at controller (`MemberController.php:63,74`) on top of the policy.
- Cycle guard double-enforced (FormRequest closure + `TeamService::reparent`); closure rebuild SQL is correct (depth math verified by `TeamHierarchyTest`).
- Optimistic lock `performUpdate` override constrains on read `lock_version` and throws on 0-row update; no spurious audit on stale write (the `updated` event fires only post-success).
- 404-not-403 for foreign ids works because route-model binding resolves through the RLS-scoped app role → row invisible → `findOrFail` 404 (`MemberManagementTest` "returns 404 for a member in another workspace").
- Audit immutability enforced at BOTH model events and DB grant (proven by `AuditLogTest`).
- `RlsPolicyCoverageTest` is a real CI guard that fails the build if any `workspace_id`-bearing table lacks an RLS policy. Good — keep it.

## Test gaps to close
1. NULL-workspace (platform-plane) audit write — currently uncovered, would have caught C1.
2. Cross-request RLS context reset — assert the terminating hook clears `app.current_workspace` + `app.current_user_id` (covers H1/H2/L4).
3. `app.current_user_id` leak: prove a request that does NOT run `IdentifyWorkspace` cannot read another user's memberships when context is stale (after fixing H1).
4. `MemberUpdateRequest` moving a member to a *foreign-workspace* team id — assert the `Rule::exists('teams')` (RLS-scoped) rejects it (validation runs after middleware, so context is set — confirm with a test).

## Unresolved questions
- Intended production topology? If Octane/PgBouncer is on the roadmap, H1 is upgraded to Critical and must ship with the terminating-reset before any pooled deployment.
- Is the audit "privileged connection" the intended design (then C1/M1 are code bugs) or was app-role-with-revoked-grant the real decision (then the docs are the bug)? This determines C1's fix direction.
- M4: is team-tag or owner's-team the intended visibility pivot for managers?
