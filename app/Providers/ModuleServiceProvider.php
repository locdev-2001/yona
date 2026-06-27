<?php

namespace App\Providers;

use App\Modules\ModuleManifest;
use App\Modules\ModuleRegistry;
use App\Modules\TopoSort;
use Illuminate\Support\ServiceProvider;

/**
 * Kernel loader — runs at Laravel boot before any module provider.
 *
 * Boot flow:
 *   1. Scan modules/star/module.json → parse ModuleManifest
 *   2. Register ALL manifests into ModuleRegistry (so registry reflects full state)
 *   3. Filter enabled=true, topo-sort by `depends`
 *   4. Register {Name}ServiceProvider per enabled module
 *
 * Security: only registers the conventional class
 *   Modules\{StudlyName}\Providers\{StudlyName}ServiceProvider
 * — never eval or include arbitrary paths from manifest.
 */
class ModuleServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $registry = new ModuleRegistry;
        $this->app->instance(ModuleRegistry::class, $registry);

        $manifests = $this->loadManifests();

        foreach ($manifests as $manifest) {
            $registry->register($manifest);
        }

        $enabled = array_filter($manifests, fn (ModuleManifest $m) => $m->enabled);

        $sorted = $this->sortByDependencies($enabled);

        foreach ($sorted as $manifest) {
            $providerClass = sprintf(
                'Modules\\%s\\Providers\\%sServiceProvider',
                $manifest->studlyName(),
                $manifest->studlyName()
            );

            if (class_exists($providerClass)) {
                $this->app->register($providerClass);
            }
        }
    }

    public function boot(): void
    {
        // Module-level boot is delegated to each {Name}ServiceProvider.
        // The loader itself has nothing to boot centrally.
    }

    /**
     * Scan modules/{name}/module.json and return parsed manifests.
     *
     * Applies config('modules.enabled_overrides') so tests can toggle modules
     * without touching module.json on disk.
     *
     * @return ModuleManifest[]
     */
    private function loadManifests(): array
    {
        $modulesPath = base_path('modules');
        if (! is_dir($modulesPath)) {
            return [];
        }

        /** @var array<string,bool> $overrides */
        $overrides = config('modules.enabled_overrides', []);

        $manifests = [];
        foreach (glob($modulesPath.'/*/module.json') as $manifestPath) {
            $manifest = ModuleManifest::fromFile($manifestPath);

            if (isset($overrides[$manifest->name])) {
                $manifest = $manifest->withEnabled($overrides[$manifest->name]);
            }

            $manifests[] = $manifest;
        }

        return $manifests;
    }

    /**
     * Topo-sort enabled manifests by `depends` so providers register in correct
     * order — ensures provider (depends:[consumer]) registers AFTER consumer,
     * allowing override of no-op default bindings (F10 invariant).
     *
     * @param  ModuleManifest[]  $manifests
     * @return ModuleManifest[]
     */
    private function sortByDependencies(array $manifests): array
    {
        // Build graph with only enabled modules.
        $enabledNames = array_map(fn (ModuleManifest $m) => $m->name, $manifests);

        $graph = [];
        foreach ($manifests as $manifest) {
            // Only include depends that are themselves enabled.
            $graph[$manifest->name] = array_values(
                array_intersect($manifest->depends, $enabledNames)
            );
        }

        $sortedNames = TopoSort::sort($graph);

        $byName = [];
        foreach ($manifests as $manifest) {
            $byName[$manifest->name] = $manifest;
        }

        return array_values(array_filter(
            array_map(fn (string $name) => $byName[$name] ?? null, $sortedNames),
            fn ($m) => $m !== null
        ));
    }
}
