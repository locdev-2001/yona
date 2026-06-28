<?php

use App\Models\CustomFieldDefinition;
use App\Services\CustomFieldService;
use App\Models\Workspace;

// Option management rules: add = ok; remove option in use = reject.

it('admin can add an option to an existing select definition', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    $definition = CustomFieldDefinition::factory()->create([
        'entity_type' => 'lead',
        'slug' => 'priority',
        'field_type' => 'select',
        'options' => ['low', 'medium'],
    ]);

    $service = app(CustomFieldService::class);
    $service->updateDefinition($definition, ['name' => $definition->name, 'options' => ['low', 'medium', 'high']]);

    expect($definition->refresh()->options)->toBe(['low', 'medium', 'high']);
});

it('removing an option not in use is allowed', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    $definition = CustomFieldDefinition::factory()->create([
        'entity_type' => 'lead',
        'slug' => 'category',
        'field_type' => 'select',
        'options' => ['A', 'B', 'C'],
    ]);

    $service = app(CustomFieldService::class);
    // Remove 'C' — not in use since no lead entity table exists yet (pre-P06)
    $service->updateDefinition($definition, ['name' => $definition->name, 'options' => ['A', 'B']]);

    expect($definition->refresh()->options)->toBe(['A', 'B']);
});

it('field_type cannot be changed via updateDefinition', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    $definition = CustomFieldDefinition::factory()->create([
        'entity_type' => 'lead',
        'slug' => 'my_input',
        'field_type' => 'input',
    ]);

    $service = app(CustomFieldService::class);
    $service->updateDefinition($definition, [
        'name' => 'Updated Name',
        'field_type' => 'number',  // ignored
    ]);

    expect($definition->refresh()->field_type)->toBe('input')
        ->and($definition->fresh()->name)->toBe('Updated Name');
});

it('entity_type cannot be changed via updateDefinition', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    $definition = CustomFieldDefinition::factory()->create([
        'entity_type' => 'lead',
        'slug' => 'my_field',
        'field_type' => 'input',
    ]);

    $service = app(CustomFieldService::class);
    $service->updateDefinition($definition, [
        'name' => 'Updated',
        'entity_type' => 'project',  // ignored
    ]);

    expect($definition->refresh()->entity_type)->toBe('lead');
});

it('definition isolation: WS-A definitions not accessible from WS-B context', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    actingInWorkspace($wsA);
    $defA = CustomFieldDefinition::factory()->create([
        'entity_type' => 'lead',
        'slug' => 'ws_a_field',
        'field_type' => 'input',
    ]);

    actingInWorkspace($wsB);
    // WS-B Eloquent scope should return null for a WS-A definition id
    expect(CustomFieldDefinition::find($defA->id))->toBeNull();
});
