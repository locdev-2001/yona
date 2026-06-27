<?php

namespace Modules\Cdp\Providers;

use Illuminate\Support\ServiceProvider;
use Modules\Cdp\Contracts\IdentityResolver;
use Modules\Cdp\NoOpIdentityResolver;

/**
 * CDP core module service provider — Phase-03 scaffold.
 *
 * Bind IdentityResolver → NoOpIdentityResolver bằng factory binding (KHÔNG singleton)
 * để Phase-07 CdpServiceProvider override được trong register() của nó.
 *
 * Thứ tự boot (topo-sort theo depends):
 *   identity → cdp (Phase-03, bind no-op) → inbox → billing → cdp-dedup (Phase-07, bind đè impl thật)
 *
 * PLACEHOLDER no-op — Phase-07 overrides bằng ContactService dedup thật.
 * Xem: plans/260627-modular-standardization/phase-07-gd1-modules.md §cdp
 */
class CdpServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Factory binding (không singleton) — Phase-07 ghi đè sau topo-sort.
        // PLACEHOLDER: Phase-07 bind đè IdentityResolver = impl dedup thật.
        $this->app->bind(IdentityResolver::class, NoOpIdentityResolver::class);
    }

    public function boot(): void
    {
        // Phase-07: load migrations cho Contact.client_id nullable + partial unique phone.
        $this->loadMigrationsFrom(__DIR__.'/../../database/migrations');
    }
}
