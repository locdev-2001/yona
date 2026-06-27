<?php

use Modules\Projects\Models\TaskChecklistItem;
use Modules\Projects\Services\TaskService;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;

// ── Checklist add/toggle/reorder/delete ──────────────────────────────────────

it('adds checklist item', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $service = app(TaskService::class);
    $task = $service->create(['name' => 'Checklist Task'], null, null, [], []);

    $item = $service->addChecklistItem($task, 'First item', null);

    expect($item->description)->toBe('First item');
    expect($item->finished)->toBeFalse();
    expect($item->task_id)->toBe($task->id);
});

it('toggles checklist item done/undone', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $service = app(TaskService::class);
    $task = $service->create(['name' => 'Toggle Task'], null, null, [], []);
    $item = $service->addChecklistItem($task, 'Toggle me', null);

    $service->toggleChecklistItem($item);
    expect($item->fresh()->finished)->toBeTrue();
    expect($item->fresh()->finished_at)->not->toBeNull();

    $service->toggleChecklistItem($item->fresh());
    expect($item->fresh()->finished)->toBeFalse();
    expect($item->fresh()->finished_at)->toBeNull();
});

it('deletes checklist item', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $service = app(TaskService::class);
    $task = $service->create(['name' => 'Delete Item'], null, null, [], []);
    $item = $service->addChecklistItem($task, 'Delete me', null);
    $itemId = $item->id;

    $service->deleteChecklistItem($item);
    expect(TaskChecklistItem::find($itemId))->toBeNull();
});

it('rejects assigned_user_id not in workspace (G12)', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    $outsider = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $service = app(TaskService::class);
    $task = $service->create(['name' => 'Restricted Item'], null, null, [], []);

    expect(fn () => $service->addChecklistItem($task, 'With outsider', $outsider->id))
        ->toThrow(InvalidArgumentException::class);
});

it('stores checklist item via route', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $task = app(TaskService::class)->create(['name' => 'Route Checklist'], null, null, [], []);

    $response = test()->post(route('tasks.checklist.store', $task), [
        'description' => 'Via route',
    ]);

    $response->assertRedirect();
    expect(TaskChecklistItem::where('task_id', $task->id)->count())->toBe(1);
});
