---
name: laravel
description: Build Laravel 13 (PHP 8.3+) backends — Eloquent models/migrations, row-level multi-tenancy, queues + Horizon, task scheduler, spatie/laravel-permission RBAC + Policies, Inertia 2 + React, Pest tests, PostgreSQL. Use for Laravel/PHP work — controllers, API, Eloquent queries, jobs, tenancy scoping, auth, migrations, or when building features in a Laravel app.
license: MIT
metadata:
  author: beru
  version: "1.0.0"
---

# Laravel

Patterns for production Laravel 13 SaaS apps. Opinionated toward **PostgreSQL + row-level multi-tenant + Inertia/React** (this project's stack). For exact current API signatures, fetch live docs via the `docs-seeker` / `context7` skill — don't rely on memory for framework specifics.

## Golden rules

- **Tenant safety first.** Every tenant-scoped query MUST be tenant-scoped at the data layer, never ad-hoc. See `references/multi-tenancy.md`.
- **Thin controllers.** Controllers orchestrate; business logic lives in **Action/Service classes**; data access in models/query scopes. Keep files focused (project rule: <200 lines).
- **Validate at the boundary** with Form Requests (`php artisan make:request`). Never trust Inertia/request input.
- **Authorize every action** with Policies — gate by role (spatie) AND record ownership (own/team/all). See `references/rbac.md`.
- **Heavy work → queue.** Anything slow (scoring, sends, sync, exports) goes to a Job on Redis queue + Horizon. Never block a request.
- **Migrations are forward-only in prod.** Additive/expand-contract; never edit a shipped migration.

## Project conventions

- PHP 8.3+, Laravel 13, PostgreSQL 16+, Redis. Frontend = Inertia 2 + React + shadcn/ui.
- Auth: Fortify/Breeze (Inertia React). RBAC: `spatie/laravel-permission` + Policies.
- Tests: **Pest** (`php artisan make:test --pest`). E2E: Playwright.
- Format with Laravel Pint. Static analysis with Larastan (PHPStan) if configured.

## Common tasks

**New tenant-scoped model**
1. `php artisan make:model Deal -mf` (model + migration + factory).
2. Migration: add `tenant_id`, `owner_id`, `team_id` (FKs), business columns, `custom_fields jsonb` if applicable, `softDeletes()`, timestamps. Composite index `(tenant_id, <hot columns>)`.
3. Add `BelongsToTenant` trait (global scope) — see references/multi-tenancy.md.
4. Add `$fillable`/`$casts` (`'custom_fields' => 'array'`). Relationships with return types.
5. Factory + Pest feature test asserting tenant isolation.

**New endpoint (Inertia)**
- Route → Controller method → Form Request (validate) → Policy (`$this->authorize(...)`) → Action/Service → `Inertia::render('Module/Page', [...])`. Return only the props the page needs.

**Background job**
- `php artisan make:job ScoreLead`, implement `ShouldQueue`, dispatch with `ScoreLead::dispatch($lead)`. Configure on a named Redis queue; monitor via Horizon. Make jobs idempotent.

**Scheduled task**
- Define in `routes/console.php` / `app/Console`. Use for SLA breach scans, stalled-deal alerts, nightly forecast. Guard against overlap (`withoutOverlapping`).

## References (read when the task needs depth)

- `references/multi-tenancy.md` — BelongsToTenant trait, middleware to bind current tenant, Postgres RLS backstop, isolation testing.
- `references/eloquent-at-scale.md` — querying ~1B rows: chunking, `lazyById`, composite indexes, JSONB GIN, avoiding N+1, query-builder/raw for reports, partitioning notes.
- `references/rbac.md` — spatie roles + Policies + own/team/all visibility resolution with team-subtree rollup.

## Anti-patterns

- Querying a tenant model without the tenant scope (data leak) — the #1 CRM bug.
- Business logic in controllers or in Blade/React; fat models with side-effects.
- Synchronous slow work in requests instead of queued jobs.
- `Model::all()` / unbounded queries on large tables — always paginate/chunk.
- Editing shipped migrations instead of adding new ones.
- Skipping `authorize()` — relying on hidden UI for security.
