<?php

namespace Tests\Feature\Modules;

use App\Modules\ModuleRegistry;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Bootstrap\RegisterProviders;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * Keystone — Case A: sample disabled by default (module.json enabled=false).
 * Disabled module không để lộ route nào và app vẫn boot sạch.
 */
class SampleDisabledTest extends TestCase
{
    use DatabaseTransactions;

    public function createApplication(): Application
    {
        $app = require Application::inferBasePath().'/bootstrap/app.php';

        // No overrides → module.json enabled=false takes effect.
        $app->beforeBootstrapping(RegisterProviders::class, function ($app) {
            $app->make('config')->set('modules.enabled_overrides', []);
        });

        $app->make(Kernel::class)->bootstrap();

        return $app;
    }

    public function test_web_route_returns_404_when_sample_disabled(): void
    {
        $this->get('/sample')->assertNotFound();
    }

    public function test_api_ping_returns_404_when_sample_disabled(): void
    {
        $this->get('/api/sample/ping')->assertNotFound();
    }

    public function test_app_boots_cleanly_and_registry_shows_disabled(): void
    {
        $this->assertFalse(app(ModuleRegistry::class)->isEnabled('sample'));
    }
}
