# Project Changelog

All notable changes to this project. Format: [Keep a Changelog](https://keepachangelog.com); dates ISO (YYYY-MM-DD). Semantic versions begin once the first code ships; pre-code foundation work lives under **[Unreleased]**.

> Maintained per `.claude/rules/documentation-management.md` — update on every significant change/feature/fix.

## [Unreleased]

### Added — Phase 0 & 1 foundation (2026-06-13)
- **Discovery** (`plans/.../reports/discovery.md`): scope (all-in-one SaaS CRM), row-level multi-tenant, mid-market scale, build order Sales-first.
- **Tech stack locked**: Laravel 12 · PostgreSQL 16 · Eloquent · Inertia 2 + React + shadcn/TanStack · Redis (Queue/Horizon) · spatie/laravel-permission.
- **Domain docs**: domain-definition, business-rules (BR-* incl. red-team BR-X11–X18), field-dictionary, actors-and-use-cases.
- **System architecture** (`docs/system-architecture.md`): 6 bounded contexts, data model, 3-layer tenant isolation + RLS, RBAC (own/team/all), transaction boundaries, custom-fields engine, audit, async, scale, frontend.
- **Authorization model** (`docs/crm-authorization-model.md`): two planes — Platform (internal staff, god-mode via audited impersonation) + Workspace (customers); global identity + membership.
- **Marketplace billing** (`docs/crm-marketplace.md`): free base + à-la-carte add-ons (feature/quota/integration/service), one-time or subscription; entitlements-as-data.
- **Cross-cutting foundations**: attachments, notifications, time/locale (UTC), human-readable record numbers, API + webhooks (shared event bus).
- **Business config** (`docs/crm-business-config.md`): default pipeline/stages, enums, SLA targets, lead scoring, base free entitlements, marketplace seeds. Currency VND.
- **Tooling**: `.claude` toolkit normalized; `laravel` skill added.

### Changed
- Identity model: per-tenant → **global identity + membership** (long-term multi-org support).
- Billing: fixed plans → **marketplace** (add-ons, one-time/subscription).
- Terminology: tenant → **workspace** (entity/column); "multi-tenant" kept as pattern name.

### Pending decisions
- Marketplace item prices (TBD — model is price-agnostic; Platform seeds later).

---

_Next: Phase 2 (Plan) → Phase 3 (Build, Sales-first). First versioned release tagged when the first build phase ships._
