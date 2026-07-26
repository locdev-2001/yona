<?php

use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Lead;
use App\Models\Pipeline;
use App\Models\PipelineStage;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceSequence;

// ── conv→Lead: happy path ─────────────────────────────────────────────────────

it('store creates a Lead from a Conversation (source=Zalo, 2-way link)', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $pipeline = Pipeline::factory()->create(['workspace_id' => $workspace->id, 'is_default' => true]);
    PipelineStage::factory()->create([
        'workspace_id' => $workspace->id,
        'pipeline_id' => $pipeline->id,
        'stage_order' => 1,
    ]);

    $conv = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'sender_uid' => 'zalo_uid_lead_001',
        'peer_name' => 'Nguyễn Văn A',
        'thread_kind' => 'direct',
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    $response = $this->postJson(route('inbox.lead.store', $conv->id));

    $response->assertOk();
    $leadId = $response->json('lead_id');
    expect($leadId)->toBeString();

    // Lead tồn tại
    $lead = Lead::find($leadId);
    expect($lead)->not->toBeNull()
        ->and($lead->conversation_id)->toBe($conv->id);

    // 2-way link
    $conv->refresh();
    expect($conv->lead_id)->toBe($leadId);
});

// ── Idempotency: 2 lần store → 1 Lead ────────────────────────────────────────

it('store is idempotent — second call returns existing lead_id without creating a new Lead', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $pipeline = Pipeline::factory()->create(['workspace_id' => $workspace->id, 'is_default' => true]);
    PipelineStage::factory()->create([
        'workspace_id' => $workspace->id,
        'pipeline_id' => $pipeline->id,
        'stage_order' => 1,
    ]);

    $conv = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'sender_uid' => 'zalo_uid_idem',
        'thread_kind' => 'direct',
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    // Lần 1
    $r1 = $this->postJson(route('inbox.lead.store', $conv->id));
    $r1->assertOk();
    $leadId1 = $r1->json('lead_id');
    expect($r1->json('existing'))->toBeFalse();

    // Lần 2 — idempotent
    $r2 = $this->postJson(route('inbox.lead.store', $conv->id));
    $r2->assertOk();
    $leadId2 = $r2->json('lead_id');

    expect($leadId2)->toBe($leadId1); // cùng lead
    expect($r2->json('existing'))->toBeTrue();

    // Chỉ 1 Lead trong DB
    $totalLeads = Lead::where('conversation_id', $conv->id)->count();
    expect($totalLeads)->toBe(1);
});

// ── Group thread guard ────────────────────────────────────────────────────────

it('store returns 422 for group conversation', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $conv = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'sender_uid' => 'zalo_group_001',
        'thread_kind' => 'group', // group
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    $response = $this->postJson(route('inbox.lead.store', $conv->id));
    $response->assertStatus(422);
    expect($response->json('message'))->toContain('nhóm');
});

// ── Dedup SĐT: 2 conv cùng peer_phone → 1 Contact ───────────────────────────

it('two conversations with same peer_phone resolve to the same Contact', function () {
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $pipeline = Pipeline::factory()->create(['workspace_id' => $workspace->id, 'is_default' => true]);
    PipelineStage::factory()->create([
        'workspace_id' => $workspace->id,
        'pipeline_id' => $pipeline->id,
        'stage_order' => 1,
    ]);

    $sharedPhone = '0901234567';

    $conv1 = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'sender_uid' => 'zalo_uid_phone_1',
        'peer_phone' => $sharedPhone,
        'peer_name' => 'Khách A',
        'thread_kind' => 'direct',
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    $conv2 = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'zalo_personal',
        'sender_uid' => 'zalo_uid_phone_2',
        'peer_phone' => $sharedPhone,
        'peer_name' => 'Khách A (dup)',
        'thread_kind' => 'direct',
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    $r1 = $this->postJson(route('inbox.lead.store', $conv1->id));
    $r1->assertOk();

    $r2 = $this->postJson(route('inbox.lead.store', $conv2->id));
    $r2->assertOk();

    $conv1->refresh();
    $conv2->refresh();

    // Cả 2 conversation trỏ đến cùng contact_id (dedup theo SĐT)
    expect($conv1->contact_id)->not->toBeNull();
    expect($conv1->contact_id)->toBe($conv2->contact_id);

    // Chỉ 1 Contact trong workspace cho SĐT này
    $contactCount = Contact::where('workspace_id', $workspace->id)
        ->where('phone', $sharedPhone)
        ->count();
    expect($contactCount)->toBe(1);
});

// ── Inbox index isolation ─────────────────────────────────────────────────────

it('inbox index does not return conversations from another workspace (RLS)', function () {
    $wsA = Workspace::factory()->create();
    $wsB = Workspace::factory()->create();
    $userA = User::factory()->create();
    $userB = User::factory()->create();

    // Create conversation in WS-A
    actingInWorkspace($wsA, $userA);
    seedMember($wsA, $userA, 'admin');

    Conversation::create([
        'workspace_id' => $wsA->id,
        'channel' => 'zalo_personal',
        'sender_uid' => 'ws_a_secret_uid',
        'thread_kind' => 'direct',
        'conversation_number' => WorkspaceSequence::next('conversation', $wsA->id),
    ]);

    // Switch to WS-B — RLS phải ẩn conversation của WS-A
    actingInWorkspace($wsB, $userB);
    seedMember($wsB, $userB, 'admin');

    // Kiểm tra RLS trực tiếp qua Eloquent (InboxController dùng cùng model)
    $found = Conversation::where('sender_uid', 'ws_a_secret_uid')->first();
    expect($found)->toBeNull();

    // Tổng số conversations trong scope WS-B = 0
    expect(Conversation::count())->toBe(0);
});
