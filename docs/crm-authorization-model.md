# CRM — Authorization Model (two planes)

> Source of truth for **who can access what**. Defines the Platform plane (your staff) and the Workspace plane (customers). Drives migrations, middleware, Policies, and RLS in Phase 1.
> Companion to [system-architecture.md](system-architecture.md) §4–5 and [crm-business-rules.md](crm-business-rules.md) §6 (BR-X*).

Date: 2026-06-13 · Status: living

## Terminology

- **Workspace** = one customer organization. The **hard data-isolation boundary** and the product/UI term. (Earlier docs say "tenant" — *tenant ≡ workspace*. "Multi-tenant" / "tenant isolation" stay as the **pattern** name; the **entity & column are `workspace` / `workspace_id`**.)
- **Plane** = a level of access that exists independently: **Platform** (your company) sits above all workspaces; **Workspace** is one customer's world.

## The two planes

```
PLATFORM PLANE  (your SaaS company — "Internal Members")
  platform roles: super_admin · support_engineer · billing_ops
  powers: list/administer workspaces, billing, god-mode data access (AUDITED, via impersonation)
        │  cross-workspace
        ▼
WORKSPACE PLANE  (customers — the isolation boundary)
  Workspace (= customer)
    └─ Membership (workspace_member): role + team + status
         workspace roles: admin · sales_manager · sales_rep ·
                          support_manager · support_agent · marketer · viewer
         └─ Team (hierarchy, closure table) → User
              record visibility: own | team-subtree | all (by role)
```

A **User is a global identity** (one email, system-wide). A user can be:
- an **Internal Member** (has a `platform_role`), and/or
- a **Workspace Member** of N workspaces (one `workspace_member` row per workspace, carrying role + team).

---

## Plane 1 — Platform (Internal Members)

### Tables
| Table | Columns | Notes |
|---|---|---|
| `users` | `email (unique global), name, password, status, is_internal` | Global identity. `is_internal` flags staff. |
| `platform_role_user` | `user_id, platform_role` | Internal staff roles. Empty for customer users. |

### Platform roles & capabilities
| Role | Capabilities |
|---|---|
| `super_admin` | Everything: manage workspaces, all data (god-mode via impersonation), platform config |
| `support_engineer` | Enter (impersonate) a workspace to troubleshoot; read/limited-write customer data |
| `billing_ops` | Workspace billing/subscription/usage; **no CRM record access** |

### God-mode, done safely (non-restrictive)
Per decision: internal staff **can access all workspace data**. To keep it coherent with RLS and defensible for compliance, access is **mediated, never silent**:

- **Impersonation session** — to view a workspace's CRM data, an internal user *enters* that workspace: server sets `app.current_workspace` to it (RLS still scopes to **one** workspace at a time — no accidental cross-workspace bleed). The session is **time-boxed** and tagged `impersonated_by = <internal user>`.
- **Audited always** (extends BR-X05) — every impersonation start/stop and every write performed while impersonating is written to `audit_logs` with the internal actor id. Cross-workspace admin/aggregate reads (e.g. platform dashboards) go through a dedicated **elevated read path** (privileged DB role bypassing RLS) that is equally audited and never exposed to customer-plane code.
- **Future-proof switch** — the impersonation gate is a single chokepoint; tightening god-mode to *customer-consent-required* later is a config/policy change, not a rewrite. (Why we model it now even though v1 allows full access.)

### Enforcement
- Internal capabilities checked by a **platform-level Gate** (separate from workspace Policies). A customer user (no `platform_role`) can never reach platform routes.
- `is_internal` / `platform_role` are server-controlled, never bound from requests (BR-X12).

---

## Plane 2 — Workspace (customers)

Unchanged from system-architecture §5, restated with canonical naming.

### Tables
| Table | Columns | Notes |
|---|---|---|
| `workspaces` | `name, base_currency, default_pipeline_id, audit_retention, status` | The isolation boundary (was `tenants`). NOT workspace-scoped itself. |
| `workspace_member` | `workspace_id, user_id, role, team_id, status, invited_at` | Membership. `unique(workspace_id, user_id)`. Role/team/status per workspace. |
| `teams` | `workspace_id, name, parent_id` | Tree; cycle-guarded (BR-X13). |
| `team_closure` | `workspace_id, ancestor_id, descendant_id, depth` | O(1) subtree for manager rollup. |

Every workspace-scoped business row carries `workspace_id` (+ `owner_id`, `team_id`).

### Two-layer access (BR-X02)
- **Feature gate** = spatie roles, scoped per workspace (spatie teams feature, `team_foreign_key = workspace_id`) → same global user holds different roles in different workspaces.
- **Record gate** = Policies + `Visibility` resolver: `own` (rep/agent) | `team` (manager = own team + descendant subtree via `team_closure`) | `all` (workspace admin).
- Per-entity, no link-bleed; children inherit parent visibility (BR-X09); 404-not-403 (BR-X15).

---

## Resolution order (every request)

```
1. Authenticate user (global identity)
2. Resolve ACTIVE workspace from session (server-side, never client — BR-X14)
3. If internal + no membership → must be in an explicit IMPERSONATION session (audited) to proceed; else 403
   Else → require an active workspace_member row; else 403
4. SET app.current_workspace  → RLS scopes every query to that one workspace
5. Feature gate (role/platform_role) → 403 if lacking capability
6. Record gate (Policy + Visibility scope) → 404 if out of visibility
```

## Enforcement layers (defense-in-depth)

1. **App**: `BelongsToWorkspace` global scope + `IdentifyWorkspace` middleware (validates membership or impersonation).
2. **RLS default-deny** on every workspace-scoped table; policy = `workspace_id = current_setting('app.current_workspace')`. Internal cross-workspace reads use a separate privileged role (audited).
3. **CI check**: every workspace-scoped table has an RLS policy (BR-X18).

## Security invariants (BR refs)

- `workspace_id`, `owner_id`, `team_id`, `role`, `is_internal`, `platform_role` are **server-controlled** (BR-X12). No mass-assignment.
- Active workspace is server-derived (BR-X14); client-supplied workspace id ignored.
- Internal data access is **always audited**, time-boxed, attributable to a real internal user (extends BR-X05). Customer PII still erasable (BR-X07); internal-actor identity retained for integrity.
- Export control (BR-X17) applies to internal exports too — audited + rate-limited.

## Open questions

1. `support_engineer` write scope while impersonating — read-only, or limited write (e.g. fix a stuck record)? (Recommend read-only v1; escalate to super_admin for writes.)
2. Customer-visible "who from support accessed my data" log (transparency feature)? Defer, but the audit trail already captures it.
