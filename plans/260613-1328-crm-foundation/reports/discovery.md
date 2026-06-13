# Phase 0 — Discovery: Enterprise CRM Foundation

Date: 2026-06-13 · Status: locked · Phase 1.5 red-team: **done** (rules hardened) · Next: Phase 1 (Domain Architecture)

> Red-team complete — see reports: [predict-red-team](predict-red-team.md), [scenario-edge-cases](scenario-edge-cases.md), [security-threat-model](security-threat-model.md). All findings folded into `docs/crm-business-rules.md` (BR-X11–X18, BR-L07, extended BR-D02/D04/S02/X02/X05/X06/X07/X08).

## Locked decisions

| Area | Decision |
|---|---|
| **Product** | All-in-one CRM — Sales + Support + Marketing in one platform |
| **Tenancy** | SaaS multi-tenant, **row-level** (`tenant_id` on every tenant-scoped table) |
| **Core modules** | Lead & Contact · Deal & Pipeline · Activity & Task · Report & RBAC (all in scope) |
| **RBAC** | **Role + record ownership** — roles gate features (admin/manager/sales/viewer); every record carries `owner_id` + `team_id`; visibility = own \| team \| all (by role) |
| **Custom fields** | **Generic core schema + custom-fields engine** (JSONB per tenant; GIN/expression index when needed). No EAV. |
| **Scale posture** | **Mid-market** — ~1,000s tenants, ~1M records/tenant (~1B rows total). Schema-ready for partitioning; physical partition/pooling **deferred** until volume justifies (red-team: avoid over-engineering before customers). |
| **Currency** | **One base currency per tenant** (`tenant.base_currency`). No per-deal FX in v1 (deferred). |
| **Team model** | **Hierarchy (tree)** via `team.parent_id`. Manager visibility = own team + descendant subtree (rollup). User has 1 primary team. |
| **Record sharing** | **None in v1** — role + ownership only. Co-selling/manual share deferred. |
| **Build order** | **Sales-first** — implement Sales core + platform first; Support & Marketing as later increments. Domain model covers all three from the start. (User: finalize business rules before any coding.) |
| **Stack** | **LOCKED — Laravel** (full table below). 2026-06-13. |

## Tech stack — LOCKED (2026-06-13)

| Layer | Choice | Why |
|---|---|---|
| Backend | **Laravel 13** (PHP 8.3+) | User experience; CRM-friendly ecosystem; mature queue/scheduler/auth out of the box. |
| Database | **PostgreSQL 16+** | JSONB custom-fields + GIN index, table partitioning (deferred), RLS backstop, strong reporting. |
| ORM | **Eloquent** (built-in) | At 1B rows: query scopes + `chunk`/`lazyById`; drop to query-builder/raw SQL for reports. |
| Multi-tenant | **`BelongsToTenant` global scope + middleware** (single-DB, row-level) **+ Postgres RLS** backstop | Enforces "never query without `tenant_id`" at the data-access layer. (`stancl/tenancy` single-database mode optional.) |
| Auth | **Fortify/Breeze** (Inertia React starter) | Session auth; Sanctum only if a token API is later needed. |
| RBAC | **`spatie/laravel-permission`** (roles) + **Policies** (record own/team/all) | Roles gate features; Policies + `owner_id`/`team_id`/team-subtree gate records. |
| Frontend | **Inertia 2 + React + shadcn/ui + Tailwind**, **TanStack Table/Query** | Reuses `ui-styling`, `tanstack`, `frontend-development`, `react-best-practices` skills; SPA feel, no separate API. |
| Background jobs | **Laravel Queue (Redis) + Horizon** | Lead scoring, marketing sends, activity sync; Horizon monitoring. |
| Cron/SLA | **Laravel Scheduler** | SLA timers, stalled-deal alerts, nightly forecast. |
| Cache/Redis | **Redis** | Cache, queue, session, rate-limiting. |
| Realtime | **Laravel Reverb** (deferred) | Live pipeline/ticket updates when needed (YAGNI). |
| Observability | **Telescope** (dev) + **Pulse** (free, self-hosted: exceptions/perf/usage) + **Sentry** (optional, free tier 5K err/mo) + structured logs | Free-first; upgrade Sentry only when volume needs alerting/grouping. |
| Test | **Pest** (unit/feature) + **Playwright** (e2e) | |
| Deploy | **Laravel Forge + VPS** (Hetzner/DO) or Docker | Queue workers + Horizon favor VPS/container over serverless. Vapor if serverless AWS wanted. |

**Toolkit:** `laravel` skill available (Eloquent, row-level tenancy, queue/Horizon, scheduler, spatie/permission + Policies, Inertia 2 + React, Pest, Postgres) — toolkit gap resolved.

**Deferred (YAGNI):** physical partitioning, Reverb, email provider, telephony, import/export, billing, per-deal FX.

## Multi-tenancy guardrails (carry into Phase 1)

- Every tenant-scoped table carries `tenant_id`; **never** query without it.
- Enforce at the data-access layer (a tenant-scoped repository/middleware), not ad-hoc per query.
- Strongly consider Postgres **RLS** as a backstop against tenant data leaks.
- Audit log + soft-delete from day one (CRM = traceability + compliance).

## Non-goals (v1)

- No custom workflow/automation builder yet.
- No native mobile app (responsive web first).
- No marketing automation beyond basic campaigns/email log.
- No third-party app marketplace.

## Resolved (was: open questions) — locked 2026-06-13

1. **RBAC** → Role + record ownership (`owner_id` + `team_id`, visibility own/team/all by role). _Not_ full Salesforce-style sharing rules in v1.
2. **Custom fields** → Generic core + JSONB custom-fields engine per tenant. _Not_ industry templates, _not_ EAV.
3. **Scale** → Mid-market posture (1,000s tenants × ~1M records). Composite indexes + partition activity/event tables + PgBouncer.
4. **ORM** → **Eloquent** (Laravel built-in) — locked with the stack above. Use query scopes for tenant/visibility; `chunk`/`lazyById` for large sets; drop to query-builder/raw SQL for heavy reports.

## Carry into Phase 1 (architecture must address)

- **Ownership model**: every tenant-scoped table → `tenant_id`, `owner_id`, `team_id`. Define visibility resolution (role × ownership) once, at the data-access layer.
- **Custom-fields**: `custom_fields JSONB` column on core entities; per-tenant field registry table (name, type, validation); GIN index strategy.
- **Mid-market scale**: composite index design `(tenant_id, ...)`; partition strategy for `activities`/`events`; Redis-backed pooling/cache. Decide where eventual consistency is acceptable (reports/analytics) vs strong (deal/money).
- **Tenant scoping in Eloquent**: `BelongsToTenant` trait + global scope + middleware; Postgres RLS as backstop. Verify global scope cannot be bypassed by raw queries/reports.
- **RBAC enforcement**: `spatie/laravel-permission` for feature roles + Laravel Policies for record-level own/team/subtree visibility.
- **Toolkit gap**: add a `laravel` skill before Phase 3 (current `backend-development` skill is Node/Python/Go only).
