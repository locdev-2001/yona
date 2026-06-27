<?php

use App\Modules\ModuleManifest;
use App\Modules\ModuleRegistry;

function makeManifest(string $name, bool $enabled = true): ModuleManifest
{
    return ModuleManifest::fromArray([
        'name' => $name,
        'version' => '0.1.0',
        'enabled' => $enabled,
        'type' => 'feature',
    ], "/modules/{$name}/module.json");
}

it('starts empty', function () {
    $r = new ModuleRegistry;
    expect($r->all())->toBe([])
        ->and($r->enabled())->toBe([]);
});

it('registers and retrieves manifests', function () {
    $r = new ModuleRegistry;
    $r->register(makeManifest('sample'));
    expect($r->all())->toHaveKey('sample');
});

it('filters enabled() correctly', function () {
    $r = new ModuleRegistry;
    $r->register(makeManifest('on', enabled: true));
    $r->register(makeManifest('off', enabled: false));

    expect(array_keys($r->enabled()))->toBe(['on'])
        ->and($r->isEnabled('on'))->toBeTrue()
        ->and($r->isEnabled('off'))->toBeFalse()
        ->and($r->isEnabled('unknown'))->toBeFalse();
});

it('isEntitled returns true stub for enabled module (TODO phase-07)', function () {
    $r = new ModuleRegistry;
    $r->register(makeManifest('sample'));
    expect($r->isEntitled('sample'))->toBeTrue();
});

it('isEntitled returns false for disabled module', function () {
    $r = new ModuleRegistry;
    $r->register(makeManifest('sample', enabled: false));
    expect($r->isEntitled('sample'))->toBeFalse();
});
