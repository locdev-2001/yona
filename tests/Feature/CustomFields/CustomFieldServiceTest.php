<?php

use App\Models\Concerns\HasCustomFields;
use App\Models\CustomFieldDefinition;
use App\Models\Workspace;
use App\Services\CustomFieldService;
use Illuminate\Database\Eloquent\Model;

// G6 — CustomFieldService tests run INDEPENDENTLY of P06 entity models.
// apply() is tested against an in-memory model stub (no real entity table needed).
// Only validate/defaults queries hit custom_field_definitions.

// ── In-memory model stub ─────────────────────────────────────────────────────

// Concrete stub class — anonymous classes with constructor params cause issues.
class LeadEntityStub extends Model
{
    use HasCustomFields;

    protected $table = 'cf_test_leads_stub';

    protected $guarded = [];

    public $timestamps = false;

    public function customFieldEntityType(): string
    {
        return 'lead';
    }

    protected function casts(): array
    {
        return ['custom_fields' => 'array'];
    }
}

// Stub for wrong entity type (not in ENTITY_TYPES)
class InvalidEntityStub extends Model
{
    use HasCustomFields;

    protected $guarded = [];

    public $timestamps = false;

    public function customFieldEntityType(): string
    {
        return 'unknown_type';
    }

    protected function casts(): array
    {
        return ['custom_fields' => 'array'];
    }
}

// ── Guard tests (G6) ─────────────────────────────────────────────────────────

it('validate throws InvalidArgumentException for unknown entity type', function () {
    $service = app(CustomFieldService::class);

    expect(fn () => $service->validate('unknown_entity', []))->toThrow(InvalidArgumentException::class);
});

it('apply throws InvalidArgumentException when model returns unknown entity type', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    $service = app(CustomFieldService::class);
    $model = new InvalidEntityStub;

    expect(fn () => $service->apply($model, []))->toThrow(InvalidArgumentException::class);
});

it('defaults throws InvalidArgumentException for unknown entity type', function () {
    $service = app(CustomFieldService::class);

    expect(fn () => $service->defaults('not_valid'))->toThrow(InvalidArgumentException::class);
});

// ── validate() ───────────────────────────────────────────────────────────────

it('validate returns empty array when payload is valid', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    CustomFieldDefinition::factory()->create([
        'entity_type' => 'lead',
        'slug' => 'my_text',
        'field_type' => 'input',
        'required' => false,
    ]);

    $service = app(CustomFieldService::class);
    $errors = $service->validate('lead', ['my_text' => 'Hello']);

    expect($errors)->toBe([]);
});

it('validate returns error for required field when missing', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    CustomFieldDefinition::factory()->create([
        'entity_type' => 'lead',
        'slug' => 'required_field',
        'field_type' => 'input',
        'required' => true,
    ]);

    $service = app(CustomFieldService::class);
    $errors = $service->validate('lead', []);

    expect($errors)->toHaveKey('required_field');
});

it('validate rejects invalid color hex', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    CustomFieldDefinition::factory()->create([
        'entity_type' => 'lead',
        'slug' => 'brand_color',
        'field_type' => 'color',
        'required' => false,
    ]);

    $service = app(CustomFieldService::class);

    $errors = $service->validate('lead', ['brand_color' => 'not-a-color']);
    expect($errors)->toHaveKey('brand_color');

    $errors = $service->validate('lead', ['brand_color' => '#FF5733']);
    expect($errors)->toBe([]);
});

it('validate rejects value not in select options', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    CustomFieldDefinition::factory()->create([
        'entity_type' => 'lead',
        'slug' => 'priority',
        'field_type' => 'select',
        'options' => ['low', 'medium', 'high'],
        'required' => false,
    ]);

    $service = app(CustomFieldService::class);
    $errors = $service->validate('lead', ['priority' => 'critical']);

    expect($errors)->toHaveKey('priority');
});

it('validate accepts valid select option', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    CustomFieldDefinition::factory()->create([
        'entity_type' => 'lead',
        'slug' => 'status',
        'field_type' => 'select',
        'options' => ['open', 'closed'],
        'required' => false,
    ]);

    $service = app(CustomFieldService::class);
    $errors = $service->validate('lead', ['status' => 'open']);

    expect($errors)->toBe([]);
});

it('validate rejects invalid link shape', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    CustomFieldDefinition::factory()->create([
        'entity_type' => 'lead',
        'slug' => 'website',
        'field_type' => 'link',
        'required' => false,
    ]);

    $service = app(CustomFieldService::class);

    $errors = $service->validate('lead', ['website' => ['url' => 'not-a-url', 'text' => 'Visit']]);
    expect($errors)->toHaveKey('website');

    $errors = $service->validate('lead', ['website' => ['url' => 'https://example.com', 'text' => 'Visit']]);
    expect($errors)->toBe([]);
});

it('validate rejects non-numeric value for number field', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    CustomFieldDefinition::factory()->create([
        'entity_type' => 'lead',
        'slug' => 'age',
        'field_type' => 'number',
        'required' => false,
    ]);

    $service = app(CustomFieldService::class);

    $errors = $service->validate('lead', ['age' => 'abc']);
    expect($errors)->toHaveKey('age');

    $errors = $service->validate('lead', ['age' => '42']);
    expect($errors)->toBe([]);
});

// ── apply() — in-memory model stub (G6: independent of P06 entity host) ─────

it('apply merges custom fields into model without overwriting existing keys', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    CustomFieldDefinition::factory()->create([
        'entity_type' => 'lead',
        'slug' => 'source',
        'field_type' => 'input',
    ]);

    $service = app(CustomFieldService::class);

    // Use stub model with pre-set custom_fields (simulates existing bag)
    $model = new LeadEntityStub;
    $model->setRawAttributes(['custom_fields' => json_encode(['existing_key' => 'keep_me'])]);

    $service->apply($model, ['source' => 'Google', 'unknown_key' => 'should_be_dropped']);

    expect($model->custom_fields)->toHaveKey('source', 'Google')
        ->and($model->custom_fields)->toHaveKey('existing_key', 'keep_me')
        ->and($model->custom_fields)->not->toHaveKey('unknown_key');
});

it('apply coerces number field to numeric', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    CustomFieldDefinition::factory()->create([
        'entity_type' => 'lead',
        'slug' => 'score',
        'field_type' => 'number',
    ]);

    $service = app(CustomFieldService::class);
    $model = new LeadEntityStub;
    $model->setRawAttributes(['custom_fields' => '{}']);

    $service->apply($model, ['score' => '42']);

    expect($model->custom_fields['score'])->toBe(42);
});

it('apply coerces multiselect to array intersected with options', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    CustomFieldDefinition::factory()->create([
        'entity_type' => 'lead',
        'slug' => 'tags',
        'field_type' => 'multiselect',
        'options' => ['A', 'B', 'C'],
    ]);

    $service = app(CustomFieldService::class);
    $model = new LeadEntityStub;
    $model->setRawAttributes(['custom_fields' => '{}']);

    // 'D' is not in options — should be filtered out
    $service->apply($model, ['tags' => ['A', 'C', 'D']]);

    expect($model->custom_fields['tags'])->toBe(['A', 'C']);
});

it('apply does not save the model (in-memory mutation only)', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    CustomFieldDefinition::factory()->create([
        'entity_type' => 'lead',
        'slug' => 'note',
        'field_type' => 'input',
    ]);

    $service = app(CustomFieldService::class);
    $model = new LeadEntityStub;
    $model->setRawAttributes(['custom_fields' => '{}']);

    $service->apply($model, ['note' => 'test']);

    // Model was never persisted — $exists should be false
    expect($model->exists)->toBeFalse()
        ->and($model->custom_fields['note'])->toBe('test');
});

// ── defaults() ───────────────────────────────────────────────────────────────

it('defaults returns coerced default values for text fields (link excluded)', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    CustomFieldDefinition::factory()->create([
        'entity_type' => 'lead',
        'slug' => 'priority',
        'field_type' => 'input',
        'default_value' => 'High',   // scalar string stored as jsonb "High"
        'active' => true,
    ]);

    CustomFieldDefinition::factory()->create([
        'entity_type' => 'lead',
        'slug' => 'website_link',
        'field_type' => 'link',
        'default_value' => ['url' => 'https://example.com', 'text' => 'Site'],
        'active' => true,
    ]);

    $service = app(CustomFieldService::class);
    $defaults = $service->defaults('lead');

    // text field should appear; link should be excluded
    expect($defaults)->toHaveKey('priority')
        ->and($defaults)->not->toHaveKey('website_link');
});

// ── Tenant isolation ──────────────────────────────────────────────────────────

it('apply in workspace B context does not write workspace A definitions', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    // Create definition in workspace A
    actingInWorkspace($wsA);
    CustomFieldDefinition::factory()->create([
        'entity_type' => 'lead',
        'slug' => 'ws_a_secret',
        'field_type' => 'input',
    ]);

    // Switch to workspace B — definition from WS-A should not load
    actingInWorkspace($wsB);
    $service = app(CustomFieldService::class);

    $model = new LeadEntityStub;
    $model->setRawAttributes(['custom_fields' => '{}']);

    // apply() loads definitions scoped to currentWorkspace (WS-B) — WS-A slug is unknown
    $service->apply($model, ['ws_a_secret' => 'stolen_value']);

    // Key should NOT be written because definition is not in WS-B registry
    expect($model->custom_fields)->toBe([]);
});

it('validate in workspace B does not see workspace A definitions', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();

    actingInWorkspace($wsA);
    CustomFieldDefinition::factory()->create([
        'entity_type' => 'lead',
        'slug' => 'secret_required',
        'field_type' => 'input',
        'required' => true,
    ]);

    // In WS-B context, no definitions exist — validate should return no errors
    actingInWorkspace($wsB);
    $service = app(CustomFieldService::class);
    $errors = $service->validate('lead', []);

    expect($errors)->toBe([]);
});
