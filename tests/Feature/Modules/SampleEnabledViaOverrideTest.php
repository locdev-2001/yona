<?php

namespace Tests\Feature\Modules;

use App\Modules\ModuleRegistry;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Bootstrap\RegisterProviders;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * Keystone — Case B: sample force-enabled via enabled_overrides.
 * Khi override enabled=true, routes phải respond 200.
 */
class SampleEnabledViaOverrideTest extends TestCase
{
    use DatabaseTransactions;

    public function createApplication(): Application
    {
        $app = require Application::inferBasePath().'/bootstrap/app.php';

        $app->beforeBootstrapping(RegisterProviders::class, function ($app) {
            $app->make('config')->set('modules.enabled_overrides', ['sample' => true]);
        });

        $app->make(Kernel::class)->bootstrap();

        return $app;
    }

    public function test_api_ping_returns_200_when_sample_force_enabled(): void
    {
        $this->get('/api/sample/ping')
            ->assertOk()
            ->assertJson(['status' => 'ok']);
    }

    public function test_registry_shows_enabled_when_overridden(): void
    {
        $this->assertTrue(app(ModuleRegistry::class)->isEnabled('sample'));
    }
}
