<?php

use Modules\CrmSales\MergeFields\LeadMergeFields;
use Modules\Email\Services\MergeFieldResolver;
use Illuminate\Database\Eloquent\Model;
use Modules\Identity\Models\User;
use Modules\Tenancy\Models\Workspace;

// ── Resolver resolves tokens from entity ──────────────────────────────────────

it('resolves lead tokens from a model-like stub', function () {
    $ws = Workspace::factory()->create(['name' => 'Acme Corp']);
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $leadStub = new class extends Model
    {
        protected $fillable = ['name', 'email', 'phone', 'company', 'lead_value'];

        protected $guarded = [];

        public $exists = true;

        public function getMorphClass(): string
        {
            return 'lead';
        }
    };
    $leadStub->name = 'Nguyễn Văn A';
    $leadStub->email = 'nva@example.com';
    $leadStub->phone = '0901234567';
    $leadStub->company = 'Test Co';
    $leadStub->lead_value = '5000000';

    $resolver = app(MergeFieldResolver::class);
    $values = $resolver->resolve(['lead' => $leadStub]);

    expect($values['lead_name'])->toBe('Nguyễn Văn A')
        ->and($values['lead_email'])->toBe('nva@example.com')
        ->and($values['company_name'])->toBe('Acme Corp') // global token
        ->and($values)->toHaveKey('current_date');
});

it('renders tokens into template text', function () {
    $ws = Workspace::factory()->create(['name' => 'My Workspace']);
    actingInWorkspace($ws);

    $resolver = app(MergeFieldResolver::class);
    $rendered = $resolver->render('Hello {lead_name} from {company_name}!', [
        'lead_name' => 'John',
        'company_name' => 'My Workspace',
    ]);

    expect($rendered)->toBe('Hello John from My Workspace!');
});

it('strips unknown tokens in rendered output', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    $resolver = app(MergeFieldResolver::class);
    $rendered = $resolver->render('Hello {unknown_token} world', []);

    expect($rendered)->not->toContain('{unknown_token}')
        ->and($rendered)->toBe('Hello  world');
});

it('returns empty string for tokens that have no value', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    $resolver = app(MergeFieldResolver::class);
    $rendered = $resolver->render('Name: {lead_name}', ['lead_name' => '']);

    expect($rendered)->toBe('Name: ');
});

// ── tokensFor ─────────────────────────────────────────────────────────────────

it('returns token labels for a known entity type', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    $resolver = app(MergeFieldResolver::class);
    $tokens = $resolver->tokensFor('lead');

    expect($tokens)->toBeArray()
        ->and($tokens)->toHaveKey('lead_name')
        ->and($tokens)->toHaveKey('assignee_name');
});

it('returns empty array for an unregistered entity type', function () {
    $ws = Workspace::factory()->create();
    actingInWorkspace($ws);

    $resolver = app(MergeFieldResolver::class);
    $tokens = $resolver->tokensFor('nonexistent_entity');

    expect($tokens)->toBeArray()->toBeEmpty();
});

// ── LeadMergeFields unit test ─────────────────────────────────────────────────

it('LeadMergeFields entity type is lead', function () {
    $resolver = new LeadMergeFields;
    expect($resolver->entityType())->toBe('lead');
});

it('LeadMergeFields tokens returns a non-empty array', function () {
    $resolver = new LeadMergeFields;
    $tokens = $resolver->tokens();

    expect($tokens)->toBeArray()
        ->and($tokens)->toHaveKey('lead_name')
        ->and($tokens)->toHaveKey('lead_email');
});
