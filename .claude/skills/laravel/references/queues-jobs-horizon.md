# Queues, Jobs & Horizon

Redis-backed queues monitored by **Horizon**. Anything slow or external (scoring, sends, sync, exports, AI calls, webhooks-out) is a job. Two rules dominate: **idempotent** and **tenant-aware**.

## Job skeleton (tenant-safe + idempotent)

```php
class ScoreLead implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public array $backoff = [10, 60, 300];      // exponential-ish retry spacing (seconds)
    public int $timeout = 120;

    public function __construct(public string $tenantId, public int $leadId) {}

    public function handle(): void
    {
        // Re-bind tenant — jobs have NO request, so global scope sees no currentTenant.
        $tenant = Tenant::findOrFail($this->tenantId);
        app()->instance('currentTenant', $tenant);
        Context::add('tenant_id', $tenant->id);  // propagates to logs

        $lead = Lead::findOrFail($this->leadId);  // now tenant-scoped + RLS-safe
        // ...idempotent work: compute then upsert, don't append blindly.
    }

    public function uniqueId(): string { return "score:{$this->tenantId}:{$this->leadId}"; }
}
```
Pass scalar ids, not full models, to keep payloads small and avoid stale serialized state. Dispatch: `ScoreLead::dispatch($tenant->id, $lead->id)->onQueue('scoring');`.

## Idempotency

Workers retry. A job that runs twice must not double-charge / double-send / duplicate rows.
- `ShouldBeUnique` + `uniqueId()` to dedupe in-flight dispatches.
- Guard external sends with a dedupe key / "already sent?" check before the side effect.
- Use `upsert()` / `updateOrCreate()` over blind `insert()` for sync jobs.

## Named queues & priorities

Split by SLA: `realtime` (notifications), `default`, `scoring`, `exports` (slow). Configure Horizon supervisors with appropriate `balance`, `maxProcesses`, `tries`, `timeout` per queue in `config/horizon.php`. Keep slow exports off the same workers as user-facing notifications.

## Batching & chaining

```php
Bus::batch($leads->map(fn ($l) => new ScoreLead($tenantId, $l->id)))
    ->name("score:{$tenantId}")
    ->onQueue('scoring')
    ->allowFailures()
    ->then(fn (Batch $b) => /* all done */)
    ->catch(fn (Batch $b, $e) => /* first failure */)
    ->dispatch();

Bus::chain([new SyncDeals($t), new RecomputeForecast($t)])->dispatch(); // sequential
```
Use batches for fan-out (re-score all leads), chains for ordered pipelines.

## Rate limiting external APIs

Throttle jobs hitting a third party (email, AI provider) with `Redis::throttle()` or middleware `WithoutOverlapping` / `RateLimited`:

```php
public function middleware(): array
{
    return [new RateLimited('ai-provider'), (new WithoutOverlapping($this->tenantId))->expireAfter(180)];
}
```
Define the limiter in a service provider. On hit, the job is released back with backoff — keep it idempotent.

## Scheduling (Laravel 13)

Define in `bootstrap/app.php` `->withSchedule(...)` or `routes/console.php`:

```php
$schedule->command('sla:scan')->everyFiveMinutes()->withoutOverlapping()->runInBackground();
$schedule->job(new NightlyForecast)->dailyAt('01:00');
```
Cron jobs loop tenants (no request context) — pass `tenant_id` into each dispatched job, re-bind in `handle()`.

## Failure handling & observability

- `failed_jobs` table + `php artisan queue:retry` / Horizon UI to inspect & replay.
- Implement `failed(Throwable $e)` on critical jobs to alert / compensate.
- Horizon metrics: throughput, wait time, runtime. Alert on growing wait on user-facing queues.
- Local: **Pail** (`php artisan pail`) to tail logs live; **Telescope** for job/request/query inspection.
- Run workers with `queue:work` (supervised) — never `queue:listen` in prod. Deploy must `queue:restart` so workers reload code.

## Anti-patterns

- Forgetting to re-bind the tenant in `handle()` → either a leak or a "no tenant context" abort.
- Serializing Eloquent models with mutated state into the payload.
- Non-idempotent sends (duplicate emails on retry).
- One mega-queue for everything — slow exports starve notifications.
- Heavy work in `defer()`/`afterResponse` that must actually survive failure — use a job.
