<?php

use App\Models\Activity;
use App\Models\Conversation;
use App\Models\Note;
use App\Models\QuickReply;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceSequence;
use App\Services\TagService;
use Inertia\Testing\AssertableInertia;

/**
 * P07 — tầng CRM channel-agnostic: gán phụ trách + label (tags) + note + canned.
 * KHÔNG chữ 'zalo' nào trong code phase này (grep gate chạy riêng).
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function crmSetup(): array
{
    $workspace = Workspace::factory()->create();
    $user = User::factory()->create();
    actingInWorkspace($workspace, $user);
    seedMember($workspace, $user, 'admin');

    $conversation = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'mock_channel', // channel-agnostic — không cần zalo
        'peer_uid' => 'peer_crm_'.uniqid(),
        'thread_type' => 0,
        'peer_name' => 'Khách CRM',
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);

    return [$workspace, $user, $conversation];
}

// ── Assign ───────────────────────────────────────────────────────────────────

it('gán phụ trách: member active OK + activity log; user ngoài workspace → 422', function () {
    [$workspace, $user, $conversation] = crmSetup();

    $response = $this->patchJson(route('inbox.assign', $conversation->id), ['user_id' => $user->id]);

    $response->assertOk();
    expect($conversation->fresh()->assigned_user_id)->toBe($user->id);

    $activity = Activity::where('subject_id', $conversation->id)->where('action', 'conversation.assigned')->sole();
    expect($activity->payload['assigned_user_id'])->toBe($user->id);

    // User lạ (không phải member) → 422
    $outsider = User::factory()->create();
    $this->patchJson(route('inbox.assign', $conversation->id), ['user_id' => $outsider->id])
        ->assertStatus(422);
    expect($conversation->fresh()->assigned_user_id)->toBe($user->id);

    // Bỏ gán
    $this->patchJson(route('inbox.assign', $conversation->id), ['user_id' => null])->assertOk();
    expect($conversation->fresh()->assigned_user_id)->toBeNull();
});

it('filter unread=1 chỉ trả hội thoại còn tin chưa đọc', function () {
    [$workspace, , $conversation] = crmSetup();

    $other = Conversation::create([
        'workspace_id' => $workspace->id,
        'channel' => 'mock_channel',
        'peer_uid' => 'peer_crm_other_'.uniqid(),
        'thread_type' => 0,
        'conversation_number' => WorkspaceSequence::next('conversation', $workspace->id),
    ]);
    $other->forceFill(['unread_count' => 3])->save();

    $this->get(route('inbox.index', ['unread' => '1']))->assertOk()
        ->assertInertia(function (AssertableInertia $page) use ($conversation, $other) {
            $ids = collect($page->toArray()['props']['conversations']['data'])->pluck('id');
            expect($ids)->toContain($other->id)->not->toContain($conversation->id);

            return $page;
        });
});

// ── Labels (tags polymorphic) ────────────────────────────────────────────────

it('label qua tags/taggables morph: sync + filter theo tag + panel trả về', function () {
    [, , $conversation] = crmSetup();

    app(TagService::class)->sync($conversation, ['VIP', 'Cần chăm']);

    expect($conversation->tags()->pluck('name')->all())->toBe(['VIP', 'Cần chăm']);

    $tagId = $conversation->tags()->first()->id;
    $this->get(route('inbox.index', ['tag' => $tagId]))->assertOk()
        ->assertInertia(function (AssertableInertia $page) use ($conversation) {
            expect(collect($page->toArray()['props']['conversations']['data'])->pluck('id'))->toContain($conversation->id);

            return $page;
        });

    $panel = $this->getJson(route('inbox.panel', $conversation->id))->assertOk()->json();
    expect(collect($panel['tags'])->pluck('name'))->toContain('VIP');
});

// ── Notes ────────────────────────────────────────────────────────────────────

it('note nội bộ morph conversation: tạo qua notes.store + panel trả về, KHÔNG vào stream tin', function () {
    [, , $conversation] = crmSetup();

    $this->post(route('notes.store'), [
        'noteable_type' => 'conversation',
        'noteable_id' => $conversation->id,
        'body' => 'Khách hẹn gọi lại 15h',
    ]);

    expect(Note::where('noteable_id', $conversation->id)->count())->toBe(1);

    $panel = $this->getJson(route('inbox.panel', $conversation->id))->assertOk()->json();
    expect($panel['notes'][0]['body'])->toBe('Khách hẹn gọi lại 15h');

    // KHÔNG vào stream tin nhắn
    $stream = $this->getJson(route('inbox.stream', $conversation->id))->assertOk()->json('items');
    expect(collect($stream)->where('item_type', 'message')->count())->toBe(0);
});

// ── Canned replies ───────────────────────────────────────────────────────────

it('quick replies CRUD + RLS scope theo workspace', function () {
    crmSetup();

    $created = $this->postJson(route('inbox.quick-replies.store'), [
        'title' => 'chao',
        'body' => 'Chào {ten_khach}, shop có thể giúp gì ạ?',
    ])->assertCreated()->json();

    expect($this->getJson(route('inbox.quick-replies.index'))->json())->toHaveCount(1);

    $this->putJson(route('inbox.quick-replies.update', $created['id']), [
        'title' => 'chao-khach',
        'body' => 'Chào {ten_khach}!',
    ])->assertOk();

    // Workspace khác KHÔNG thấy
    $ws2 = Workspace::factory()->create();
    $user2 = User::factory()->create();
    actingInWorkspace($ws2, $user2);
    seedMember($ws2, $user2, 'admin');
    expect($this->getJson(route('inbox.quick-replies.index'))->json())->toHaveCount(0);
    expect(QuickReply::count())->toBe(0); // RLS + scope

    // Xoá từ workspace khác → 404
    $this->deleteJson(route('inbox.quick-replies.destroy', $created['id']))->assertNotFound();
});
