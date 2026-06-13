# Phase 0 — Discovery: Enterprise CRM Foundation

Date: 2026-06-13 · Status: locked · Next: Phase 1 (Domain Architecture)

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
| **Stack** | **NOT locked — decided later.** Candidate below for reference only. |

## Candidate stack — NOT yet chosen (decide after domain architecture)

> User decision: tech stack is deferred. The table below is a reference recommendation, not a commitment.

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router, RSC, Server Actions) + TypeScript | Single codebase, server components ideal for CRM dashboards; covered by `web-frameworks`, `react-best-practices` skills. Can extract a standalone API later if scale demands. |
| Database | **PostgreSQL** | Row-level multi-tenancy via `tenant_id`; optional RLS policies for defense-in-depth; strong for reporting. Covered by `databases` skill. |
| ORM | **Pending — decided in Phase 1** | Deferred: `backend-architect` confirms after data model is locked. Front-runner = Drizzle (typed, explicit SQL — good for tenant scoping + report queries); alternatives = Prisma (DX) or postgres.js (raw control). |
| Auth | **better-auth** + organization plugin | Built-in orgs (= tenants) + RBAC + sessions; matches `better-auth` skill exactly. |
| UI | **shadcn/ui + Tailwind**, **TanStack Table/Query** | Data grids, filters, dashboards. Covered by `ui-styling`, `tanstack`, `frontend-development`. |
| Hosting | **Vercel** + managed Postgres (Neon/Supabase) | `vercel` plugin + `deploy` skill available. |

**Deferred (decide when needed — YAGNI):** background jobs/queue (marketing sends, activity sync), email provider, telephony, import/export, billing.

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
4. **ORM** → Deferred to Phase 1; `backend-architect` picks after data model is locked (Drizzle front-runner).

## Carry into Phase 1 (architecture must address)

- **Ownership model**: every tenant-scoped table → `tenant_id`, `owner_id`, `team_id`. Define visibility resolution (role × ownership) once, at the data-access layer.
- **Custom-fields**: `custom_fields JSONB` column on core entities; per-tenant field registry table (name, type, validation); GIN index strategy.
- **Mid-market scale**: composite index design `(tenant_id, ...)`; partition strategy for `activities`/`events`; pooling. Decide where eventual consistency is acceptable (reports/analytics) vs strong (deal/money).
- **ORM bake-off**: confirm Drizzle vs Prisma vs postgres.js as first Phase-1 task before any schema is written.
