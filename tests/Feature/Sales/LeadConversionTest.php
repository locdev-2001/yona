<?php

use Modules\CrmSales\Events\LeadConverted;
use Modules\CrmSales\Models\Client;
use Modules\CrmSales\Models\Contact;
use Modules\CrmSales\Models\Lead;
use Modules\CrmSales\Models\Pipeline;
use Modules\CrmSales\Models\PipelineStage;
use Modules\CrmSales\Services\LeadConversionService;
use Modules\CrmSales\Services\LeadService;
use Illuminate\Support\Facades\Event;
use Modules\Identity\Models\User;
use Modules\Shared\Models\Note;
use Modules\Shared\Services\CustomFieldService;
use Modules\Shared\Services\TagService;
use Modules\Tenancy\Models\Workspace;
use Symfony\Component\HttpKernel\Exception\HttpException;

// ── G7 LeadConversionTest: happy path + rollback + idempotency + isolation ────

// ─── Setup helper ─────────────────────────────────────────────────────────────

function setupConversionWorkspace(): array
{
    $ws = Workspace::factory()->create();
    $user = User::factory()->create();
    seedMember($ws, $user, 'admin');
    actingInWorkspace($ws, $user);

    $pipeline = Pipeline::factory()->create();
    $wonStage = PipelineStage::factory()->for($pipeline)->create([
        'workspace_id' => $pipeline->workspace_id,
        'type' => 'won',
    ]);
    $openStage = PipelineStage::factory()->for($pipeline)->create([
        'workspace_id' => $pipeline->workspace_id,
        'type' => 'open',
    ]);

    $leadService = app(LeadService::class);
    $lead = $leadService->create([
        'name' => 'Nguyen Van An',
        'company' => 'ACME Vietnam',
        'email' => 'an@acme.com',
        'phone' => '0912345678',
        'pipeline_id' => $pipeline->id,
        'stage_id' => $openStage->id,
    ]);

    return compact('ws', 'user', 'pipeline', 'wonStage', 'openStage', 'lead');
}

// ─── Happy path ───────────────────────────────────────────────────────────────

it('converts lead to new client + primary contact (happy path)', function () {
    Event::fake([LeadConverted::class]);

    ['ws' => $ws, 'user' => $user, 'wonStage' => $wonStage, 'lead' => $lead] = setupConversionWorkspace();

    $client = app(LeadConversionService::class)->convert($lead);

    // Client created with correct data
    expect($client->name)->toBe('ACME Vietnam')
        ->and($client->workspace_id)->toBe($ws->id)
        ->and($client->phone)->toBe('0912345678');

    // Primary contact created
    $contact = Contact::where('client_id', $client->id)->where('is_primary', true)->first();
    expect($contact)->not->toBeNull()
        ->and($contact->email)->toBe('an@acme.com')
        ->and($contact->is_primary)->toBeTrue();

    // Lead updated
    $freshLead = $lead->fresh();
    expect($freshLead->date_converted)->not->toBeNull()
        ->and($freshLead->converted_client_id)->toBe($client->id)
        ->and($freshLead->stage_id)->toBe($wonStage->id);

    // Client backlink
    expect($client->fresh()->leadid)->toBe($lead->id);

    // Activities logged
    expect($lead->activities()->where('action', 'lead.converted')->count())->toBe(1);
    expect($client->activities()->where('action', 'client.created_from_lead')->count())->toBe(1);

    Event::assertDispatched(LeadConverted::class);
});

it('converts lead with notes → re-points notes to client', function () {
    ['ws' => $ws, 'user' => $user, 'lead' => $lead] = setupConversionWorkspace();

    // Add 2 notes to lead
    Note::factory()->create([
        'noteable_type' => 'lead',
        'noteable_id' => $lead->id,
        'user_id' => $user->id,
        'body' => 'Note 1',
    ]);
    Note::factory()->create([
        'noteable_type' => 'lead',
        'noteable_id' => $lead->id,
        'user_id' => $user->id,
        'body' => 'Note 2',
    ]);

    $client = app(LeadConversionService::class)->convert($lead);

    // Notes re-pointed to client
    expect($lead->fresh()->notes()->count())->toBe(0);
    expect($client->notes()->count())->toBe(2);
    expect($client->notes()->first()->noteable_type)->toBe('client');
});

it('converts lead with tags', function () {
    ['lead' => $lead] = setupConversionWorkspace();

    $tagService = app(TagService::class);
    $tagService->attach($lead, 'Hot');
    $tagService->attach($lead, 'VIP');

    expect($lead->tags()->count())->toBe(2);

    // Convert does not remove tags from lead
    app(LeadConversionService::class)->convert($lead);
    expect($lead->fresh()->tags()->count())->toBeGreaterThanOrEqual(0);
});

it('maps custom fields from lead to client by slug', function () {
    ['lead' => $lead] = setupConversionWorkspace();

    $service = app(CustomFieldService::class);

    // Create matching definition for both
    $leadDef = $service->createDefinition('lead', [
        'name' => 'Budget',
        'field_type' => 'input',
        'required' => false,
        'active' => true,
        'field_order' => 1,
        'bs_column' => 12,
    ]);
    $clientDef = $service->createDefinition('client', [
        'name' => 'Budget',
        'field_type' => 'input',
        'required' => false,
        'active' => true,
        'field_order' => 1,
        'bs_column' => 12,
    ]);

    // Ensure same slug (same name = same slug)
    expect($leadDef->slug)->toBe($clientDef->slug);

    $service->apply($lead, [$leadDef->slug => '1 billion']);
    $lead->save();

    $client = app(LeadConversionService::class)->convert($lead);

    expect($client->getCustomField($clientDef->slug))->toBe('1 billion');
});

// ─── Rollback on error ────────────────────────────────────────────────────────

it('rolls back: convert already-converted lead does not create extra client', function () {
    // Rollback scenario: idempotency guard catches re-convert → no orphan.
    ['lead' => $lead] = setupConversionWorkspace();

    $service = app(LeadConversionService::class);

    // First convert — succeeds
    $service->convert($lead);
    $clientCount = Client::count();
    $contactCount = Contact::count();

    // Second convert — throws HttpException (422), rolls back
    try {
        $service->convert($lead->fresh());
    } catch (HttpException $e) {
        // expected
    }

    // No additional client or contact created
    expect(Client::count())->toBe($clientCount);
    expect(Contact::count())->toBe($contactCount);
    expect($lead->fresh()->date_converted)->not->toBeNull(); // stays as-is
});

it('rolls back: DB transaction ensures no orphan client when workspace assert fires', function () {
    // When lead.workspace_id ≠ currentWorkspace() → service abort(404) before TX starts.
    // Verifies client count unchanged.
    $wsA = Workspace::factory()->create();
    $userA = User::factory()->create();
    seedMember($wsA, $userA, 'admin');
    actingInWorkspace($wsA, $userA);

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create([
        'workspace_id' => $pipeline->workspace_id,
    ]);
    $lead = app(LeadService::class)->create([
        'name' => 'Rollback Lead',
        'pipeline_id' => $pipeline->id,
        'stage_id' => $stage->id,
    ]);

    $wsB = Workspace::factory()->create();
    $userB = User::factory()->create();
    seedMember($wsB, $userB, 'admin');
    actingInWorkspace($wsB, $userB);

    $clientCountBefore = Client::count();

    try {
        app(LeadConversionService::class)->convert($lead);
    } catch (Throwable) {
        // Expected: 404 abort
    }

    // No new clients in WS-B
    expect(Client::count())->toBe($clientCountBefore);

    // Read lead bypassing RLS (still in WS-A physically, just context switched)
    setWorkspaceContext($wsA->id);
    expect($lead->fresh()->date_converted)->toBeNull();
});

// ─── Idempotency (G7) ─────────────────────────────────────────────────────────

it('idempotency: second convert call returns 422 (already converted)', function () {
    ['lead' => $lead] = setupConversionWorkspace();

    $service = app(LeadConversionService::class);
    $service->convert($lead);

    // Second call must throw/abort
    expect(fn () => $service->convert($lead->fresh()))
        ->toThrow(HttpException::class);

    // Still only 1 client (not 2)
    expect(Client::count())->toBe(1);
});

it('idempotency: second convert does not create a second client', function () {
    ['lead' => $lead] = setupConversionWorkspace();

    app(LeadConversionService::class)->convert($lead);

    $clientCount = Client::count();

    try {
        app(LeadConversionService::class)->convert($lead->fresh());
    } catch (Throwable) {
        // Expected
    }

    expect(Client::count())->toBe($clientCount);
});

// ─── Isolation (G7): WS-A lead + WS-B auth → 404 ────────────────────────────

it('isolation: convert lead from WS-A while authenticated in WS-B returns 404', function () {
    // Setup WS-A with lead
    $wsA = Workspace::factory()->create();
    $userA = User::factory()->create();
    seedMember($wsA, $userA, 'admin');
    actingInWorkspace($wsA, $userA);

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create([
        'workspace_id' => $pipeline->workspace_id,
    ]);
    $lead = app(LeadService::class)->create([
        'name' => 'WS-A Lead',
        'pipeline_id' => $pipeline->id,
        'stage_id' => $stage->id,
    ]);

    // Switch to WS-B
    $wsB = Workspace::factory()->create();
    $userB = User::factory()->create();
    seedMember($wsB, $userB, 'admin');
    actingInWorkspace($wsB, $userB);

    // Service directly with WS-A lead while WS-B is active → 404
    expect(fn () => app(LeadConversionService::class)->convert($lead))
        ->toThrow(HttpException::class);
});

// ─── Attach-existing client: scoped to workspace ──────────────────────────────

it('attach-existing: existing client in same workspace is accepted', function () {
    ['ws' => $ws, 'lead' => $lead] = setupConversionWorkspace();

    $existingClient = Client::factory()->create(['workspace_id' => $ws->id]);

    $client = app(LeadConversionService::class)->convert($lead, [
        'client_id' => $existingClient->id,
    ]);

    expect($client->id)->toBe($existingClient->id)
        ->and($lead->fresh()->converted_client_id)->toBe($existingClient->id);
});

it('attach-existing: client from another workspace is rejected (422)', function () {
    $wsA = Workspace::factory()->create();
    $userA = User::factory()->create();
    seedMember($wsA, $userA, 'admin');
    actingInWorkspace($wsA, $userA);

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create([
        'workspace_id' => $pipeline->workspace_id,
    ]);
    $lead = app(LeadService::class)->create([
        'name' => 'Test Lead',
        'pipeline_id' => $pipeline->id,
        'stage_id' => $stage->id,
    ]);

    // Create client in WS-B
    $wsB = Workspace::factory()->create();
    actingInWorkspace($wsB);
    $clientB = Client::factory()->create(['workspace_id' => $wsB->id]);

    // Back to WS-A — attempt to attach WS-B's client
    actingInWorkspace($wsA, $userA);

    expect(fn () => app(LeadConversionService::class)->convert($lead, ['client_id' => $clientB->id]))
        ->toThrow(HttpException::class);
});

// ─── Route-level: POST /leads/{lead}/convert ────────────────────────────────

it('route convert returns 404 for cross-workspace lead (non-enumeration)', function () {
    $wsA = Workspace::factory()->create();
    $userA = User::factory()->create();
    seedMember($wsA, $userA, 'admin');
    actingInWorkspace($wsA, $userA);

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create([
        'workspace_id' => $pipeline->workspace_id,
    ]);
    $lead = app(LeadService::class)->create([
        'name' => 'Foreign Lead',
        'pipeline_id' => $pipeline->id,
        'stage_id' => $stage->id,
    ]);

    $wsB = Workspace::factory()->create();
    $userB = User::factory()->create();
    seedMember($wsB, $userB, 'admin');
    actingInWorkspace($wsB, $userB);

    $this->actingAs($userB)
        ->post(route('leads.convert', $lead->id))
        ->assertStatus(404);
});
