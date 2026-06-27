<?php

namespace Modules\Sample\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Modules\Sample\Contracts\SampleGreeter;
use Modules\Sample\NoOpSampleGreeter;

/**
 * Sample module service provider.
 *
 * Demonstrates:
 *  - Per-module route loading (web + api, guard file_exists) — F8
 *  - Per-module migration loading — F3
 *  - Per-module config merge — F3
 *  - No-op default binding for SampleGreeter contract — F10 pattern
 *
 * A provider module wanting to override SampleGreeter would:
 *   1. khai `"depends": ["sample"]` in its module.json
 *   2. bind its real implementation in its own ServiceProvider::register()
 *   Topo-sort guarantees it runs AFTER this provider → override wins.
 */
class SampleServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // F10 no-op default binding: consumer (this module) owns the contract
        // and binds the no-op. A dependent provider overrides after topo-sort.
        $this->app->bind(SampleGreeter::class, NoOpSampleGreeter::class);

        $this->mergeConfigFrom(
            __DIR__.'/../../config/sample.php',
            'sample'
        );
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../../database/migrations');

        $this->loadWebRoutes();
        $this->loadApiRoutes();
        $this->loadChannelRoutes();
    }

    private function loadWebRoutes(): void
    {
        $path = __DIR__.'/../../routes/web.php';
        if (file_exists($path)) {
            Route::middleware('web')->group($path);
        }
    }

    private function loadApiRoutes(): void
    {
        $path = __DIR__.'/../../routes/api.php';
        if (file_exists($path)) {
            // No session, no ResetTenantContext — webhook-safe group.
            Route::middleware('api')->prefix('api')->group($path);
        }
    }

    private function loadChannelRoutes(): void
    {
        $path = __DIR__.'/../../routes/channels.php';
        if (file_exists($path)) {
            require $path;
        }
    }
}
