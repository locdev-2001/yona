<?php

use App\Models\Workspace;
use App\Models\WorkspaceSetting;
use App\Services\SettingsService;
use Illuminate\Support\Facades\DB;

it('set() upserts a setting for the active workspace', function () {
    $workspace = Workspace::factory()->create();
    actingInWorkspace($workspace);

    $service = app(SettingsService::class);
    $service->set('test_key', 'hello');

    expect(WorkspaceSetting::where('key', 'test_key')->value('value'))->toBe('hello');
});

it('get() returns the decoded value', function () {
    $workspace = Workspace::factory()->create();
    actingInWorkspace($workspace);

    $service = app(SettingsService::class);
    $service->set('my_setting', ['foo' => 'bar']);

    expect($service->get('my_setting'))->toBe(['foo' => 'bar']);
});

it('get() returns default when key is absent', function () {
    $workspace = Workspace::factory()->create();
    actingInWorkspace($workspace);

    expect(app(SettingsService::class)->get('nonexistent', 'fallback'))->toBe('fallback');
});

it('forget() removes the row entirely', function () {
    $workspace = Workspace::factory()->create();
    actingInWorkspace($workspace);

    $service = app(SettingsService::class);
    $service->set('to_delete', true);
    $service->forget('to_delete');

    expect(WorkspaceSetting::where('key', 'to_delete')->exists())->toBeFalse();
});

it('unique (workspace_id, key) is enforced — second set() upserts not duplicates', function () {
    $workspace = Workspace::factory()->create();
    actingInWorkspace($workspace);

    $service = app(SettingsService::class);
    $service->set('dup_key', 'first');
    $service->set('dup_key', 'second');

    expect(WorkspaceSetting::where('key', 'dup_key')->count())->toBe(1)
        ->and($service->get('dup_key'))->toBe('second');
});

it('value column stores JSON not PHP-serialized string', function () {
    $workspace = Workspace::factory()->create();
    actingInWorkspace($workspace);

    app(SettingsService::class)->set('json_test', ['x' => 1]);

    $raw = DB::table('workspace_settings')
        ->where('key', 'json_test')
        ->value('value');

    // Should be valid JSON, not a PHP-serialized string like a:1:{...}
    $decoded = json_decode($raw, true);
    expect(json_last_error())->toBe(JSON_ERROR_NONE)
        ->and($decoded)->toBe(['x' => 1]);
});
