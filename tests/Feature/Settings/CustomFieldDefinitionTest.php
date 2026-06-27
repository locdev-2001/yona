<?php

use Modules\Identity\Models\User;
use Modules\Shared\Models\CustomFieldDefinition;
use Modules\Shared\Services\CustomFieldService;
use Modules\Tenancy\Models\Workspace;

// Custom-field definition CRUD + authz matrix.

it('admin can list custom field definitions', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    actingInWorkspace($ws);
    CustomFieldDefinition::factory()->count(2)->forEntity('lead')->create();

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->get(route('custom-fields.index').'?entity_type=lead')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/custom-fields/index'));
});

it('unauthenticated user is redirected from index', function () {
    $ws = Workspace::factory()->create();

    $this->get(route('custom-fields.index'))
        ->assertRedirect('/login');
});

it('member without permission cannot create a definition (403)', function () {
    $ws = Workspace::factory()->create();
    $member = User::factory()->create();
    seedMember($ws, $member, 'sales_rep');

    $this->actingAs($member)
        ->withSession(['current_workspace_id' => $ws->id])
        ->post(route('custom-fields.store'), [
            'entity_type' => 'lead',
            'name' => 'Test Field',
            'field_type' => 'input',
        ])
        ->assertForbidden();
});

it('admin can create an input definition with auto slug', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    actingInWorkspace($ws);

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->post(route('custom-fields.store'), [
            'entity_type' => 'lead',
            'name' => 'My Custom Field',
            'field_type' => 'input',
            'required' => false,
            'active' => true,
            'field_order' => 0,
            'bs_column' => 12,
        ])
        ->assertRedirect();

    actingInWorkspace($ws);
    $definition = CustomFieldDefinition::where('name', 'My Custom Field')->first();
    expect($definition)->not->toBeNull()
        ->and($definition->slug)->toBe('my_custom_field')
        ->and($definition->entity_type)->toBe('lead')
        ->and($definition->field_type)->toBe('input');
});

it('admin can create a select definition with options', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    actingInWorkspace($ws);

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->post(route('custom-fields.store'), [
            'entity_type' => 'lead',
            'name' => 'Status Field',
            'field_type' => 'select',
            'options' => ['New', 'In Progress', 'Done'],
        ])
        ->assertRedirect();

    actingInWorkspace($ws);
    $definition = CustomFieldDefinition::where('name', 'Status Field')->first();
    expect($definition->options)->toBe(['New', 'In Progress', 'Done']);
});

it('creating select definition without options fails validation', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->post(route('custom-fields.store'), [
            'entity_type' => 'lead',
            'name' => 'Bad Select',
            'field_type' => 'select',
            'options' => [],
        ])
        ->assertSessionHasErrors('options');
});

it('slug collision is resolved with suffix', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    actingInWorkspace($ws);
    $service = app(CustomFieldService::class);

    // Create first definition via factory so slug = 'my_field'
    $first = CustomFieldDefinition::factory()->forEntity('lead')->create([
        'name' => 'My Field',
        'slug' => 'my_field',
        'field_type' => 'input',
    ]);

    // Create second via service — should get slug 'my_field_2'
    $second = $service->createDefinition('lead', [
        'name' => 'My Field',
        'field_type' => 'input',
    ]);

    expect($second->slug)->toBe('my_field_2');
});

it('admin can update a definition name', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    actingInWorkspace($ws);
    $definition = CustomFieldDefinition::factory()->forEntity('lead')->create(['name' => 'Old Name']);

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->put(route('custom-fields.update', $definition->id), ['name' => 'New Name'])
        ->assertRedirect();

    expect($definition->refresh()->name)->toBe('New Name');
});

it('entity_type and field_type cannot be changed on update', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    actingInWorkspace($ws);
    $definition = CustomFieldDefinition::factory()->forEntity('lead')->create(['field_type' => 'input']);

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->put(route('custom-fields.update', $definition->id), [
            'name' => 'Updated Name',
            'entity_type' => 'project',  // ignored
            'field_type' => 'number',    // ignored
        ])
        ->assertRedirect();

    $definition->refresh();
    expect($definition->entity_type)->toBe('lead')
        ->and($definition->field_type)->toBe('input')
        ->and($definition->name)->toBe('Updated Name');
});

it('admin can soft-delete a definition', function () {
    $ws = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($ws, $admin, 'admin');

    actingInWorkspace($ws);
    $definition = CustomFieldDefinition::factory()->forEntity('lead')->create();

    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $ws->id])
        ->delete(route('custom-fields.destroy', $definition->id))
        ->assertRedirect();

    actingInWorkspace($ws);
    expect(CustomFieldDefinition::find($definition->id))->toBeNull();
    expect(CustomFieldDefinition::withTrashed()->find($definition->id))->not->toBeNull();
});

it('definition from another workspace returns 404 (non-enumeration)', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();
    $admin = User::factory()->create();
    seedMember($wsB, $admin, 'admin');

    // Create definition in workspace A
    actingInWorkspace($wsA);
    $definition = CustomFieldDefinition::factory()->forEntity('lead')->create();

    // Try to delete it from workspace B context
    $this->actingAs($admin)
        ->withSession(['current_workspace_id' => $wsB->id])
        ->delete(route('custom-fields.destroy', $definition->id))
        ->assertNotFound();
});
