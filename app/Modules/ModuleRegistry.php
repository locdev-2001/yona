<?php

namespace App\Modules;

/**
 * Singleton registry — queried after ModuleServiceProvider loads all manifests.
 *
 * enabled()      → system-level (module.json enabled flag).
 * isEntitled()   → per-workspace gate. Stub here; TODO phase-07: wire Entitlements.
 */
final class ModuleRegistry
{
    /** @var array<string, ModuleManifest> name → manifest */
    private array $manifests = [];

    public function register(ModuleManifest $manifest): void
    {
        $this->manifests[$manifest->name] = $manifest;
    }

    /** All manifests regardless of enabled status. */
    public function all(): array
    {
        return $this->manifests;
    }

    /** Manifests where enabled === true (system-level). */
    public function enabled(): array
    {
        return array_filter($this->manifests, fn (ModuleManifest $m) => $m->enabled);
    }

    public function isEnabled(string $name): bool
    {
        return isset($this->manifests[$name]) && $this->manifests[$name]->enabled;
    }

    /**
     * Per-workspace entitlement check.
     *
     * ponytail: stub — always true at system level; phase-07 will inject
     * Entitlements::check($workspace, $manifest->entitlement) here.
     *
     * @todo phase-07: connect WorkspaceEntitlements gate
     */
    public function isEntitled(string $name, ?int $workspaceId = null): bool
    {
        // TODO phase-07: nối Entitlements per-workspace gate
        return $this->isEnabled($name);
    }
}
