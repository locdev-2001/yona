# Row-level multi-tenancy (single DB)

Every tenant-scoped table carries `tenant_id`. Isolation is enforced at the data layer so no query can forget it. Postgres RLS is a backstop, not the primary mechanism.

## 1. `BelongsToTenant` trait + global scope

```php
// app/Models/Concerns/BelongsToTenant.php
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        // Read-side: auto-filter every query by current tenant.
        static::addGlobalScope('tenant', function (Builder $q) {
            if ($tenantId = app('currentTenant')?->id) {
                $q->where($q->getModel()->getTable().'.tenant_id', $tenantId);
            }
        });

        // Write-side: auto-stamp tenant_id on create.
        static::creating(function (Model $model) {
            if (! $model->tenant_id && $tenantId = app('currentTenant')?->id) {
                $model->tenant_id = $tenantId;
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
```

Use on every tenant model: `class Deal extends Model { use BelongsToTenant; }`.

## 2. Bind the current tenant (middleware)

```php
// app/Http/Middleware/IdentifyTenant.php
public function handle(Request $request, Closure $next)
{
    $tenant = $request->user()?->tenant;          // session auth → user belongs to tenant
    abort_unless($tenant, 403, 'No tenant context');
    app()->instance('currentTenant', $tenant);
    // Set for Postgres RLS (see below)
    DB::statement("SET app.current_tenant = '{$tenant->id}'");
    return $next($request);
}
```

Register in the authenticated middleware group so it runs after auth, before controllers.

## 3. Postgres RLS backstop

Defense-in-depth: even a query that bypasses the global scope (raw SQL, a forgotten trait) cannot cross tenants.

```sql
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON deals
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

The app DB role must NOT be a superuser / table owner (those bypass RLS). Use a dedicated `app` role with `FORCE ROW LEVEL SECURITY` if owner.

## 4. Pitfalls

- **Jobs/commands/schedulers have no request** → no `currentTenant`. Pass `tenant_id` explicitly into the job and re-bind it at the start of `handle()`, or loop tenants for cron tasks. Stamp `Context::add('tenant_id', $id)` so logs carry it. See `queues-jobs-horizon.md`.
- **Broadcasting** crosses tenants if a channel auth callback trusts the channel name — re-check `$user->tenant_id`. See `realtime-reverb.md`.
- **Reports using raw query-builder** skip the global scope → add `->where('tenant_id', $id)` manually AND rely on RLS.
- **`whereHas`/joins** — ensure the related table is also tenant-scoped or the join is constrained.
- **Unique constraints** must be composite with tenant: `unique(['tenant_id', 'email'])`, not `unique('email')`.

## 5. Isolation test (Pest — write one per tenant model)

```php
it('never leaks another tenant rows', function () {
    $a = Tenant::factory()->create();
    $b = Tenant::factory()->create();
    Deal::factory()->for($a)->count(3)->create();
    Deal::factory()->for($b)->count(2)->create();

    app()->instance('currentTenant', $a);
    expect(Deal::count())->toBe(3);            // only tenant A visible
});
```
