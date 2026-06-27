<?php

namespace Tests\Feature\Modules;

use App\Modules\ModuleRegistry;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Bootstrap\RegisterProviders;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Modules\Sample\Contracts\SampleGreeter;
use Modules\Sample\NoOpSampleGreeter;
use Tests\TestCase;

/**
 * Feature tests cho sample module loader (S0 keystone proof).
 * Module.json default=false; bật qua enabled_overrides.
 */
class SampleModuleTest extends TestCase
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

    public function test_sample_module_registered_and_enabled_via_override(): void
    {
        $this->assertTrue(app(ModuleRegistry::class)->isEnabled('sample'));
    }

    public function test_api_ping_returns_200_json_when_enabled(): void
    {
        $this->get('/api/sample/ping')
            ->assertOk()
            ->assertJson(['status' => 'ok']);
    }

    public function test_sample_greeter_resolves_to_noop_f10_pattern(): void
    {
        $greeter = app(SampleGreeter::class);
        $this->assertInstanceOf(NoOpSampleGreeter::class, $greeter);
        $this->assertSame('', $greeter->greet('world'));
    }

    public function test_module_registry_is_entitled_stub_true_todo_phase07(): void
    {
        $this->assertTrue(app(ModuleRegistry::class)->isEntitled('sample'));
    }

    /**
     * Mục F: assert resolver map thật — kiểm manifest.json chứa entry cho
     * sample page, không chỉ check Inertia component name (brittle).
     */
    public function test_sample_page_entry_exists_in_vite_manifest(): void
    {
        $manifestPath = public_path('build/manifest.json');

        if (! file_exists($manifestPath)) {
            $this->markTestSkipped('Run `npm run build` first — manifest-coupled test');
        }

        $manifest = json_decode(file_get_contents($manifestPath), associative: true);
        $this->assertIsArray($manifest);
        $this->assertArrayHasKey(
            'modules/sample/resources/js/pages/sample/index.tsx',
            $manifest,
            'Sample page entry missing from Vite manifest — module pages not bundled'
        );
    }
}
