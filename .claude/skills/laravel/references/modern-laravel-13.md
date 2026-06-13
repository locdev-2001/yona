# Modern Laravel 13 idioms

What changed vs older Laravel, and the v13-era APIs worth reaching for. Verify exact signatures with `context7` (`/laravel/docs` branch `13.x`) before relying on a snippet.

## Slim application skeleton

No `app/Http/Kernel.php` or `app/Console/Kernel.php`. Everything wires in **`bootstrap/app.php`**:

```php
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [IdentifyTenant::class]);   // tenant binding after auth
        $middleware->alias(['role' => RoleMiddleware::class]);
    })
    ->withSchedule(function (Schedule $schedule) {
        $schedule->command('sla:scan')->everyFiveMinutes()->withoutOverlapping();
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->dontReport(TenantMismatchException::class);
    })->create();
```

Service providers register in `bootstrap/providers.php` (array), not `config/app.php`.

## Casts as a method (not `$casts`)

```php
protected function casts(): array
{
    return [
        'custom_fields' => 'array',
        'closed_at'     => 'immutable_datetime',
        'value'         => 'decimal:2',
        'settings'      => AsEncryptedArrayObject::class,
    ];
}
```
Runtime overrides via `$model->mergeCasts([...])`. Enum casts: `'status' => DealStatus::class`.

## Context facade — request-scoped + log metadata

Carry data across the request and into queued jobs/logs without threading params:

```php
use Illuminate\Support\Facades\Context;

Context::add('tenant_id', $tenant->id);   // visible in every log line + propagated to jobs
Context::addHidden('trace_id', $id);      // not logged, still readable
$tenant = Context::get('tenant_id');
```
Great companion to multi-tenancy: stamp `tenant_id`/`user_id` once, get them in job logs automatically.

## Concurrency facade — parallel work

Run independent closures concurrently (forked processes) and collect results:

```php
use Illuminate\Support\Facades\Concurrency;

[$counts, $forecast] = Concurrency::run([
    fn () => Deal::where('stage', 'open')->count(),
    fn () => app(ForecastService::class)->compute($tenant),
]);
```
Use for independent reads/aggregations. Not a replacement for queues on slow user-blocking work.

## `defer()` — run after the response is sent

```php
defer(fn () => activity()->log('viewed', $deal));   // non-critical side effects
```
Pushes work after the response flushes. For anything that must survive a crash or retry, use a queued job instead.

## Automatic eager loading (beta)

Opt-in globally in `AppServiceProvider::boot()` to auto-prevent N+1:

```php
use Illuminate\Database\Eloquent\Model;
Model::automaticallyEagerLoadRelationships();
```
Still prefer explicit `with()` on hot/large paths for predictable queries. In non-prod also enable `Model::preventLazyLoading()` to catch missed eager loads.

## Modern Eloquent helpers

```php
Deal::whereLike('name', "%{$q}%")->paginate();          // DB-agnostic LIKE (case-insensitive variant: whereLike(..., caseSensitive: false))
Post::with(['comments' => fn ($q) => $q->latest()])      // constrained eager load
    ->get();
$user->posts()->chaperone();                             // auto-hydrate parent on children (avoids N+1 back-refs)
Deal::firstOrCreate([...], [...]);                       // idempotent reads/writes
```
`toQuery()`, `lazyById()`, `cursor()` for batch — see `eloquent-at-scale.md`.

## JSON:API resources (Laravel 13)

First-party JSON:API serialization — relationship inclusion, sparse fieldsets, links, compliant headers. Use for any public/partner API surface instead of hand-rolling. Generate and shape the resource, then return it from the controller. (Fetch current generator command + class API via context7.)

## AI SDK + semantic/vector search (Laravel 13)

- **Laravel AI SDK**: unified, provider-agnostic API for text generation, tool-calling agents, embeddings, audio, images, vector stores. Prefer it over raw provider SDKs for AI features (lead scoring summaries, reply drafting). Run generation/embedding **in queued jobs** (slow, costly, rate-limited).
- **Vector search**: native vector query support with **PostgreSQL + `pgvector`** (not yet installed here — add the extension + column when an embedding feature lands). Store embeddings, similarity-search against them. Keep embeddings tenant-scoped like any other row.

## Upgrade gotchas (12 → 13)

- Cache/Redis/session **prefixes** changed from `_` to `-`. To preserve existing keys, pin `CACHE_PREFIX`, `REDIS_PREFIX`, `SESSION_COOKIE` in `.env`.
- Confirm package compat: Horizon, Reverb, spatie/permission, Inertia adapter, Telescope, Pest — all must be on Laravel-13-compatible majors (this project already is).
