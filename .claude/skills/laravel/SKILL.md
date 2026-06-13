---
name: laravel
description: Build Laravel 13 (PHP 8.4+) backends — Eloquent models/migrations, row-level multi-tenancy, queues + Horizon, scheduler, spatie/laravel-permission RBAC + Policies, Inertia 2 + React 19, Reverb realtime, Pest 4 (feature + browser) tests, PostgreSQL. Use for Laravel/PHP work — controllers, API/JSON resources, Eloquent queries, jobs, tenancy scoping, auth, broadcasting, migrations, or building features in a Laravel app.
license: MIT
metadata:
  author: beru
  version: "2.0.0"
---

# Laravel

Patterns for production **Laravel 13** SaaS apps. Opinionated toward this project's stack: **PHP 8.4 · PostgreSQL 16 · Redis · Inertia 2 + React 19 + shadcn/ui · Horizon · Reverb**. For exact current API signatures, fetch live docs via `docs-seeker` / `context7` (`/laravel/docs` branch `13.x`, `/websites/pestphp`) — don't trust memory for framework specifics.

## Golden rules

- **Tenant safety first.** Every tenant-scoped query MUST be scoped at the data layer, never ad-hoc. → `references/multi-tenancy.md`.
- **Thin controllers.** Controllers orchestrate; business logic → **Action/Service classes**; data access → models/query scopes. Files focused (<200 lines).
- **Validate at the boundary** with Form Requests. Never trust Inertia/request input. → `references/api-inertia.md`.
- **Authorize every action** with Policies — gate by role (spatie) AND record ownership (own/team/all). → `references/rbac.md`.
- **Heavy work → queue.** Slow work (scoring, sends, sync, exports, AI calls) goes to an idempotent Job on a Redis queue + Horizon. Never block a request. → `references/queues-jobs-horizon.md`.
- **Migrations are forward-only in prod.** Additive / expand–contract; never edit a shipped migration.
- **Tests are a gate, not optional.** Pest 4 feature test (incl. tenant-isolation) per model/feature; browser test for critical flows. → `references/testing-pest.md`.

## Stack & conventions (Laravel 13)

- PHP **8.4+**, Laravel **13.15+**, PostgreSQL **16+**, Redis. Frontend = Inertia **2** + React **19** + shadcn/ui (Ziggy for routes).
- **Slim skeleton**: no `app/Http/Kernel.php`/`Console/Kernel.php`. Wire middleware, exceptions, routing, scheduling in **`bootstrap/app.php`**. Providers in `bootstrap/providers.php`.
- **Casts as a method**: `protected function casts(): array` (not the `$casts` property).
- Auth: Fortify/Breeze (Inertia React). RBAC: `spatie/laravel-permission` (team_foreign_key = tenant) + Policies.
- Realtime: **Reverb** (WebSockets) for Conversations/Inbox. → `references/realtime-reverb.md`.
- Tests: **Pest 4** (`php artisan make:test --pest`); browser testing via `visit()` (no separate Playwright needed for most flows). Lint: **Pint**. Static analysis: **Larastan 3** (PHPStan). Local debug: **Telescope** + **Pail**.
- New in 13 (reach for when needed): first-party **AI SDK**, **JSON:API resources**, **pgvector** semantic/vector search, `Context` facade, `Concurrency` facade, `defer()`. → `references/modern-laravel-13.md`.

## Common tasks

**New tenant-scoped model**
1. `php artisan make:model Deal -mf` (model + migration + factory).
2. Migration: `tenant_id`, `owner_id`, `team_id` FKs, business columns, `custom_fields jsonb` if applicable, `softDeletes()`, timestamps. Composite index `(tenant_id, <hot cols>)`; composite uniques include `tenant_id`.
3. `use BelongsToTenant;` (global scope + auto-stamp) — see references/multi-tenancy.md.
4. `$fillable` + `casts()` method (`'custom_fields' => 'array'`). Relationships with return types.
5. Factory + Pest feature test asserting tenant isolation.

**New endpoint (Inertia)**
- Route → Controller method → Form Request (validate) → `$this->authorize(...)` (Policy) → Action/Service → `Inertia::render('Module/Page', [...])`. Return only props the page needs; use lazy props for expensive data.

**JSON / API resource**
- Eloquent API Resource or **JSON:API resource** (Laravel 13) for compliant serialization, relationship includes, sparse fieldsets. → `references/api-inertia.md`.

**Background job**
- `php artisan make:job ScoreLead`, implement `ShouldQueue`, dispatch `ScoreLead::dispatch($lead)`. Named Redis queue; Horizon-monitored; **idempotent**; **re-bind tenant** inside `handle()`. → `references/queues-jobs-horizon.md`.

**Scheduled task**
- Define via `->withSchedule(...)` in `bootstrap/app.php` or in `routes/console.php`. SLA scans, stalled-deal alerts, nightly forecast. Guard with `withoutOverlapping()` / `runInBackground()`.

**Realtime event**
- Event implements `ShouldBroadcast` → broadcast on a tenant/user-scoped **private/presence** channel → consume via Echo + Reverb. Authorize channels in `routes/channels.php`. → `references/realtime-reverb.md`.

## References (read when the task needs depth)

- `references/modern-laravel-13.md` — v13 idioms: slim skeleton, `casts()`, `Context`, `Concurrency`, `defer()`, automatic eager loading, JSON:API, AI SDK + pgvector, modern Eloquent (`whereLike`, `chaperone`).
- `references/multi-tenancy.md` — BelongsToTenant trait, current-tenant binding, Postgres RLS backstop, isolation testing.
- `references/eloquent-at-scale.md` — querying at scale: chunk/`lazyById`/cursor, composite + GIN indexes, kill N+1, query-builder for reports, partitioning.
- `references/rbac.md` — spatie roles + Policies + own/team/all visibility with team-subtree rollup.
- `references/queues-jobs-horizon.md` — Horizon, batching/chaining, idempotency, tenant rebind in jobs, rate-limiting/backoff, failure handling.
- `references/api-inertia.md` — Form Requests, Eloquent API + JSON:API resources, Inertia 2 props (lazy/deferred/partial reload), pagination contracts.
- `references/testing-pest.md` — Pest 4 feature + browser + architecture tests, factories, tenant-isolation tests, faking queues/events/notifications.
- `references/realtime-reverb.md` — Reverb broadcasting, private/presence channel auth, tenant-scoped channels, Echo client wiring.

## Anti-patterns

- Querying a tenant model without the tenant scope (data leak) — the #1 CRM bug.
- Business logic in controllers or React; fat models with side-effects.
- Synchronous slow work in requests instead of queued jobs; jobs that aren't idempotent or forget to re-bind the tenant.
- `Model::all()` / unbounded queries on big tables — always paginate/chunk/cursor.
- Editing shipped migrations; non-composite unique constraints on tenant tables.
- Skipping `authorize()` — relying on hidden UI for security.
- Broadcasting on public channels or leaking cross-tenant events.
- Using the legacy `$casts` property / expecting `app/Http/Kernel.php` (gone in the slim skeleton).
