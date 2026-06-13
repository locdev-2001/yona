# Project Changelog

All notable changes to this project. Format: [Keep a Changelog](https://keepachangelog.com); dates ISO (YYYY-MM-DD). Semantic versions begin once the first code ships; pre-code foundation work lives under **[Unreleased]**.

> Maintained per `.claude/rules/documentation-management.md` — update on every significant change/feature/fix.
> **Automated by [release-please](https://github.com/googleapis/release-please)** from conventional commits: merging the bot's release PR bumps the version, tags it, and writes the release section here. SemVer `0.x` during build → `1.0.0` at production launch. (GitHub Releases = internal/dev notes; customer-facing "What's New" lives in the in-app Announcements feature — see crm-conversations-inbox/marketplace docs.)

## [Unreleased]

### Added — App scaffold / bootstrap (2026-06-13)
- **Laravel app initialized** from `laravel/react-starter-kit` (Inertia 2 + React + shadcn/Tailwind), merged into repo (docs/plans/.claude/README preserved).
- **Laravel 13.15 on PHP 8.4** (L13 requires 8.4): switched local default PHP 8.3→8.4 (`.zshrc`), installed `phpredis` ext for 8.4.
- **Packages**: spatie/laravel-permission 8, Horizon, Reverb, Telescope (dev), Pest 4 + pest-plugin-laravel 4, Larastan, Pint.
- **Env**: Postgres (`beru_crm` / `beru_crm_test`), Redis (cache/queue/session), Reverb broadcasting. `phpunit.xml` → Postgres test DB (RLS/JSONB need pgsql, not sqlite).
- **Verified**: `artisan about` green, migrations run, **26 tests pass** on pgsql.
- Note: spatie-permission migration NOT run yet — deferred to Module 1 (RBAC keeps role in `workspace_member`, team-scoped).

### Added — Phase 0 & 1 foundation (2026-06-13)
- **Discovery** (`plans/.../reports/discovery.md`): scope (all-in-one SaaS CRM), row-level multi-tenant, mid-market scale, build order Sales-first.
- **Tech stack locked**: Laravel 13 · PostgreSQL 16 · Eloquent · Inertia 2 + React + shadcn/TanStack · Redis (Queue/Horizon) · spatie/laravel-permission.
- **Domain docs**: domain-definition, business-rules (BR-* incl. red-team BR-X11–X18), field-dictionary, actors-and-use-cases.
- **System architecture** (`docs/system-architecture.md`): 6 bounded contexts, data model, 3-layer tenant isolation + RLS, RBAC (own/team/all), transaction boundaries, custom-fields engine, audit, async, scale, frontend.
- **Authorization model** (`docs/crm-authorization-model.md`): two planes — Platform (internal staff, god-mode via audited impersonation) + Workspace (customers); global identity + membership.
- **Marketplace billing** (`docs/crm-marketplace.md`): free base + à-la-carte add-ons (feature/quota/integration/service), one-time or subscription; entitlements-as-data.
- **Cross-cutting foundations**: attachments, notifications, time/locale (UTC), human-readable record numbers, API + webhooks (shared event bus), **product announcements/changelog** (customer-facing "What's New").
- **Business config** (`docs/crm-business-config.md`): default pipeline/stages, enums, SLA targets, lead scoring, base free entitlements, marketplace seeds. Currency VND.
- **Tooling**: `.claude` toolkit normalized; `laravel` skill added.
- **Dev environment**: this machine = local (PHP 8.4 host + local Postgres/Redis). Docker Compose (PHP 8.4-fpm + Nginx + PostgreSQL 16 + Redis 7 + Node/Vite + Horizon/Reverb profiles) provided for other devs' machines; `docs/local-development.md`.
- **GitHub**: `.github/` (PR/issue templates, Laravel CI, dependabot, CODEOWNERS); labels, milestones (M1–M4), 10 build-phase issues; squash-only + auto-delete-branch.

- **Conversations / Inbox** (`docs/crm-conversations-inbox.md`): V1 realtime omnichannel live chat (web widget + Zalo + FB + email), Conversation/Message model, escalate→Ticket. Mandates Laravel Reverb (now v1 infra).

### Changed
- Identity model: per-tenant → **global identity + membership** (long-term multi-org support).
- Billing: fixed plans → **marketplace** (add-ons, one-time/subscription).
- Terminology: tenant → **workspace** (entity/column); "multi-tenant" kept as pattern name.
- Realtime (Reverb): deferred → **v1 infra** (required by live chat).
- Email two-way: moved from "integration later" → a **Conversations channel** (v1 core).

### Pending decisions
- Marketplace item prices (TBD — model is price-agnostic; Platform seeds later).

---

_Next: Phase 2 (Plan) → Phase 3 (Build, Sales-first). First versioned release tagged when the first build phase ships._
