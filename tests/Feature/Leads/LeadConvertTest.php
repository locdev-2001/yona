<?php

use App\Events\LeadConverted;
use Modules\CrmSales\Models\Client;
use Modules\CrmSales\Models\Contact;
use Modules\CrmSales\Models\Pipeline;
use Modules\CrmSales\Models\PipelineStage;
use Modules\CrmSales\Services\LeadConversionService;
use Modules\CrmSales\Services\LeadService;
use Illuminate\Support\Facades\Event;
use Modules\Identity\Models\User;
use Modules\Shared\Models\Note;
use Modules\Tenancy\Models\Workspace;
use Symfony\Component\HttpKernel\Exception\HttpException;

// ── G7 Convert Lead → Client + Contact ───────────────────────────────────────

it('converts lead to new client + primary contact', function () {
    Event::fake([LeadConverted::class]);

    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $pipeline = Pipeline::factory()->create();
    $wonStage = PipelineStage::factory()->for($pipeline)->create([
        'workspace_id' => $pipeline->workspace_id,
        'type' => 'won',
    ]);
    $stage = PipelineStage::factory()->for($pipeline)->create([
        'workspace_id' => $pipeline->workspace_id,
        'type' => 'open',
    ]);

    $leadService = app(LeadService::class);
    $lead = $leadService->create([
        'name' => 'John Doe',
        'company' => 'ACME Corp',
        'email' => 'john@acme.com',
        'phone' => '0123456789',
        'pipeline_id' => $pipeline->id,
        'stage_id' => $stage->id,
    ]);

    $conversionService = app(LeadConversionService::class);
    $client = $conversionService->convert($lead);

    // Client created
    expect($client->name)->toBe('ACME Corp');
    expect($client->workspace_id)->toBe($workspace->id);

    // Primary contact created
    $contact = Contact::where('client_id', $client->id)->where('is_primary', true)->first();
    expect($contact)->not->toBeNull();
    expect($contact->email)->toBe('john@acme.com');

    // Lead updated
    $freshLead = $lead->fresh();
    expect($freshLead->date_converted)->not->toBeNull();
    expect($freshLead->converted_client_id)->toBe($client->id);
    expect($freshLead->stage_id)->toBe($wonStage->id);

    // Client backlink
    expect(Client::find($client->id)->leadid)->toBe($lead->id);

    Event::assertDispatched(LeadConverted::class);
});

it('convert is idempotent: second call returns 422', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id]);

    $leadService = app(LeadService::class);
    $lead = $leadService->create(['name' => 'Convert Once', 'pipeline_id' => $pipeline->id, 'stage_id' => $stage->id]);

    $conversionService = app(LeadConversionService::class);
    $conversionService->convert($lead);

    // Second call should abort 422
    expect(fn () => $conversionService->convert($lead->fresh()))
        ->toThrow(HttpException::class);
});

it('convert lead from WS-A while auth in WS-B returns 404 (cross-workspace)', function () {
    $workspace1 = Workspace::factory()->create();
    $workspace2 = Workspace::factory()->create();
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();

    // Create lead in WS-1
    actingInWorkspace($workspace1, $user1);
    seedMember($workspace1, $user1, 'admin');

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id]);

    $leadService = app(LeadService::class);
    $lead = $leadService->create(['name' => 'WS1 Lead', 'pipeline_id' => $pipeline->id, 'stage_id' => $stage->id]);

    // Now switch to WS-2 and try to convert WS-1's lead
    actingInWorkspace($workspace2, $user2);
    seedMember($workspace2, $user2, 'admin');

    // The lead won't be found via route-model-binding (global scope), but if we
    // call the service directly with the model, it should 404
    expect(fn () => app(LeadConversionService::class)->convert($lead))
        ->toThrow(HttpException::class);
});

it('convert re-points notes to client', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $pipeline = Pipeline::factory()->create();
    $stage = PipelineStage::factory()->for($pipeline)->create(['workspace_id' => $pipeline->workspace_id]);

    $leadService = app(LeadService::class);
    $lead = $leadService->create(['name' => 'Note Lead', 'pipeline_id' => $pipeline->id, 'stage_id' => $stage->id]);

    // Create a note on the lead (noteable_type/id are server-controlled, use direct assignment)
    $note = new Note;
    $note->workspace_id = $workspace->id;
    $note->noteable_type = 'lead';
    $note->noteable_id = $lead->id;
    $note->user_id = $user->id;
    $note->body = 'Test note on lead';
    $note->save();

    $client = app(LeadConversionService::class)->convert($lead);

    // Note should now point to client
    $note->refresh();
    expect($note->noteable_type)->toBe('client');
    expect($note->noteable_id)->toBe($client->id);
});
