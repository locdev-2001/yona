# Testing with Pest 4

`pestphp/pest ^4` + `pest-plugin-laravel`. Pest 4 adds first-class **browser testing** (`visit()`), so most E2E flows live here instead of a separate Playwright suite. Three layers: **feature** (HTTP + DB), **browser** (real browser, critical flows), **architecture** (structural guards). Verify current syntax via `context7` (`/websites/pestphp`).

## Feature test (the workhorse)

```php
use function Pest\Laravel\{actingAs, postJson};

it('creates a deal scoped to the current tenant', function () {
    $tenant = Tenant::factory()->create();
    $user   = User::factory()->for($tenant)->create();
    app()->instance('currentTenant', $tenant);

    actingAs($user)
        ->postJson('/deals', ['name' => 'Acme', 'value' => 5000])
        ->assertCreated();

    expect(Deal::where('name', 'Acme')->first()->tenant_id)->toBe($tenant->id);
});
```

`uses(RefreshDatabase::class)->in('Feature');` in `tests/Pest.php` (sqlite in-memory or a Postgres test DB — prefer Postgres in CI so RLS/jsonb behave like prod).

## Tenant-isolation test (one per tenant model — mandatory)

```php
it('never leaks another tenant rows', function () {
    [$a, $b] = [Tenant::factory()->create(), Tenant::factory()->create()];
    Deal::factory()->for($a)->count(3)->create();
    Deal::factory()->for($b)->count(2)->create();

    app()->instance('currentTenant', $a);
    expect(Deal::count())->toBe(3);   // only A visible through the global scope
});
```

## Authorization test (Policy + visibility)

```php
it('forbids editing a deal you do not own', function () {
    $tenant = Tenant::factory()->create();
    $owner  = User::factory()->for($tenant)->create();
    $other  = User::factory()->for($tenant)->create();
    $deal   = Deal::factory()->for($tenant)->for($owner, 'owner')->create();
    app()->instance('currentTenant', $tenant);

    actingAs($other)->putJson("/deals/{$deal->id}", ['name' => 'x'])->assertForbidden();
});
```

## Faking side effects

```php
Queue::fake();      ScoreLead::dispatch($t->id, $lead->id);  Queue::assertPushed(ScoreLead::class);
Event::fake();      // ... ; Event::assertDispatched(DealWon::class);
Notification::fake(); // ... ; Notification::assertSentTo($user, SlaBreached::class);
Bus::fake();        // assert batches/chains
Http::fake(['ai.provider/*' => Http::response(['score' => 0.8])]);  // stub external APIs
```
Assert the job/event was queued — don't run slow real work in unit/feature tests.

## Browser test (critical user flows)

```php
it('lets a sales rep close a deal', function () {
    Event::fake();
    $user = User::factory()->create();

    visit('/login')->on()->desktop()
        ->fill('email', $user->email)->fill('password', 'password')->press('Log in')
        ->assertSee('Dashboard')
        ->click('Pipeline')->click('Acme')->press('Mark Won')
        ->assertSee('Closed Won')
        ->assertNoJavascriptErrors()      // catches React/Inertia console errors
        ->assertNoConsoleLogs();

    Event::assertDispatched(DealWon::class);
});
```
Supports `->on()->mobile()/->tablet()/->desktop()`, `->firefox()/->safari()`, `->inDarkMode()`, screenshots, and parallel runs. Use full Laravel helpers (factories, fakes, `assertAuthenticated()`) inside browser tests.

## Architecture tests (cheap structural guards)

```php
arch('controllers are thin and suffixed')
    ->expect('App\Http\Controllers')->toHaveSuffix('Controller')->toExtend(Controller::class);

arch('models avoid leaking outside the boundary')
    ->expect('App\Models')->not->toUse(['dd', 'dump', 'ray']);

arch('strict types everywhere')->expect('App')->toUseStrictTypes();

arch()->preset()->laravel();   // built-in Laravel convention preset
arch()->preset()->security();  // flags risky calls (eval, md5, mt_rand, ...)
```

## Datasets (table-driven)

```php
it('validates value range', function (int $value, bool $ok) {
    $r = actingAs($user)->postJson('/deals', ['name' => 'x', 'value' => $value]);
    $ok ? $r->assertCreated() : $r->assertInvalid('value');
})->with([[0, false], [1, true], [-5, false]]);
```

## Running

- `php artisan test` or `./vendor/bin/pest` · `--parallel` for speed · `--coverage --min=80` to gate.
- `--filter` / `--group` to scope. CI: run feature + arch on every push; browser on critical paths.
- Never weaken assertions or fake data just to go green — fix the code. Tests verify the final merged code.
