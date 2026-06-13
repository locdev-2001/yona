# RBAC: roles (features) + Policies (records)

Two layers, distinct jobs:
- **Roles** (`spatie/laravel-permission`) gate *features/actions* — "can this user create deals at all?"
- **Policies + ownership columns** gate *records* — "can this user see/edit *this* deal?" via own / team / all.

## Roles & permissions (spatie)

```php
// Seeder — per tenant, roles map to feature permissions
$admin   = Role::create(['name' => 'admin']);
$manager = Role::create(['name' => 'manager']);
$sales   = Role::create(['name' => 'sales']);
$viewer  = Role::create(['name' => 'viewer']);

Permission::create(['name' => 'deal.create']);
$sales->givePermissionTo('deal.create');
// ...
$user->assignRole('sales');
```
spatie is tenant-team aware via its `teams` config — set `team_foreign_key = tenant_id` so roles are scoped per tenant.

## Visibility scope (own / team / all)

Resolve once, centrally. Team hierarchy = tree (`team.parent_id`); managers see their subtree.

```php
// app/Support/Visibility.php
public static function scopeFor(Builder $q, User $u): Builder
{
    return match (self::visibilityLevel($u)) {
        'all'  => $q,                                   // admin
        'team' => $q->whereIn('team_id', $u->visibleTeamIds()), // manager: own + descendant teams
        default => $q->where('owner_id', $u->id),       // sales/viewer: own only
    };
}
```

`visibleTeamIds()` returns the user's team + all descendant team ids (cache the subtree; recursive CTE or a closure table for deep trees).

## Policy enforces it per action

```php
// app/Policies/DealPolicy.php
public function view(User $u, Deal $deal): bool
{
    if ($u->hasRole('admin')) return true;
    if ($u->can('deal.viewTeam') && in_array($deal->team_id, $u->visibleTeamIds())) return true;
    return $deal->owner_id === $u->id;
}
public function update(User $u, Deal $deal): bool
{
    return $u->can('deal.update') && $this->view($u, $deal);
}
```

In the controller: `$this->authorize('update', $deal);` before mutating. For lists, apply `Visibility::scopeFor()` to the query — Policies guard single records, scopes guard collections.

## Rules

- Never rely on hidden UI for security — always `authorize()` server-side.
- Reassigning `owner_id`/`team_id` changes visibility → audit-log it; restrict who can reassign.
- Deactivating a user who owns open records → reassignment flow (see business rules), don't orphan records.
- Combine with tenant global scope: visibility runs *inside* the already-tenant-scoped query.
