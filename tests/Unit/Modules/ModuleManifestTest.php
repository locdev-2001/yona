<?php

use App\Modules\ModuleManifest;

it('parses valid module.json', function () {
    $manifest = ModuleManifest::fromArray([
        'name' => 'sample',
        'version' => '0.1.0',
        'enabled' => true,
        'type' => 'feature',
        'depends' => [],
        'provides' => ['sample.ping'],
        'entitlement' => null,
    ], '/modules/sample/module.json');

    expect($manifest->name)->toBe('sample')
        ->and($manifest->version)->toBe('0.1.0')
        ->and($manifest->enabled)->toBeTrue()
        ->and($manifest->type)->toBe('feature')
        ->and($manifest->depends)->toBeArray()->toHaveCount(0)
        ->and($manifest->entitlement)->toBeNull();
});

it('defaults depends/provides to empty arrays', function () {
    $manifest = ModuleManifest::fromArray([
        'name' => 'minimal',
        'version' => '0.1.0',
        'enabled' => false,
        'type' => 'core',
    ], '/modules/minimal/module.json');

    expect($manifest->depends)->toBe([])
        ->and($manifest->provides)->toBe([]);
});

it('throws on missing required field', function () {
    ModuleManifest::fromArray([
        'name' => 'bad',
        'version' => '0.1.0',
        'enabled' => true,
        // missing type
    ], '/modules/bad/module.json');
})->throws(InvalidArgumentException::class, 'type');

it('throws on unknown type', function () {
    ModuleManifest::fromArray([
        'name' => 'bad',
        'version' => '0.1.0',
        'enabled' => true,
        'type' => 'invalid-type',
    ], '/modules/bad/module.json');
})->throws(InvalidArgumentException::class, 'unknown type');

it('returns studly name', function () {
    $m = ModuleManifest::fromArray([
        'name' => 'channel-zalo',
        'version' => '0.1.0',
        'enabled' => true,
        'type' => 'driver',
    ], '/modules/channel-zalo/module.json');

    expect($m->studlyName())->toBe('ChannelZalo');
});

it('studly name for single word', function () {
    $m = ModuleManifest::fromArray([
        'name' => 'sample',
        'version' => '0.1.0',
        'enabled' => true,
        'type' => 'feature',
    ], '/modules/sample/module.json');

    expect($m->studlyName())->toBe('Sample');
});
