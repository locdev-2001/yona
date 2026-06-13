# Eloquent at scale (~1B rows total)

Mid-market posture: ~1,000s tenants × ~1M records. The DB is the bottleneck, not PHP. Design indexes and queries first.

## Indexing

- Every tenant-scoped hot query → **composite index leading with `tenant_id`**: `(tenant_id, owner_id, stage)`, `(tenant_id, created_at)`.
- Match index column order to the query's WHERE + ORDER BY.
- JSONB custom fields: GIN index `CREATE INDEX ... USING gin (custom_fields jsonb_path_ops)`; or expression index on a specific key when filtering one field hot.
- Avoid indexing low-cardinality columns alone.

## Never load unbounded sets

```php
// ❌ Model::all() / ->get() on a big table
// ✅ paginate for UI
Deal::where('stage', 'open')->paginate(50);

// ✅ chunk / lazy for batch processing (keyset, stable)
Deal::where('tenant_id', $id)->lazyById(1000)->each(fn ($d) => /* ... */);

// ✅ cursor for memory-light streaming
foreach (Deal::where(...)->cursor() as $deal) { /* ... */ }
```

## Kill N+1

```php
// Eager-load relations the view needs
Deal::with(['contact:id,name', 'owner:id,name'])->paginate(50);
// Aggregates without loading children
Account::withCount('deals')->withSum('deals', 'value')->get();
```
Enable `Model::preventLazyLoading()` in non-prod to catch N+1 early.

## Reports → drop to Query Builder / raw

Eloquent hydration is wasteful for aggregations. Use the query builder and let Postgres do the work.

```php
DB::table('deals')
    ->where('tenant_id', $id)
    ->selectRaw('stage, count(*) n, sum(value) total')
    ->groupBy('stage')
    ->get();
```
Heavy/slow analytics → precompute via a queued job into a summary table; serve reports from that (eventual consistency is fine for analytics; keep deal/money paths strongly consistent).

## Writes

- Bulk insert with `insert()` (no events) or `upsert()` for idempotent syncs; chunk large batches.
- Wrap multi-row money/state changes in `DB::transaction()`.

## Partitioning (deferred until volume justifies)

`activities` / `events` are append-heavy and grow fastest. When a single tenant or the table gets large: declarative range partition by month on `created_at` (or hash by `tenant_id`). Keep migrations partition-ready (don't rely on table-level serial PKs that fight partitioning). Don't pre-partition before customers — schema-ready is enough now.

## Connection pooling

Redis for cache/queue. Add PgBouncer (transaction pooling) when concurrent workers + web dynos exhaust Postgres connections — not before.
