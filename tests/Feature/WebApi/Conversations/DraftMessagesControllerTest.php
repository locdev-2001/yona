<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\User;
use App\Support\ConversationDraftMessage;
use Illuminate\Support\Facades\Redis;

// Port từ spec/controllers/api/v1/accounts/conversations/draft_messages_controller_spec.rb.

beforeEach(function () {
    Redis::flushdb();

    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
    ]);

    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);
    $this->inbox->inboxMembers()->create(['user_id' => $this->agent->id]);

    $this->url = "/api/v1/accounts/{$this->account->id}/conversations/{$this->conversation->display_id}/draft_messages";
});

it('returns unauthorized for an unauthenticated user', function () {
    $this->getJson($this->url)->assertUnauthorized();
});

it('saves the draft message for the conversation', function () {
    $this->actingAs($this->agent)
        ->patchJson($this->url, ['draft_message' => ['message' => 'a draft in progress']])
        ->assertNoContent(200);

    expect(ConversationDraftMessage::get($this->conversation->id))->toBe('a draft in progress');
});

it('gets the draft message for the conversation', function () {
    ConversationDraftMessage::put($this->conversation->id, 'a draft in progress');

    $this->actingAs($this->agent)
        ->getJson($this->url)
        ->assertOk()
        ->assertExactJson(['has_draft' => true, 'message' => 'a draft in progress']);
});

it('reports no draft when nothing was saved', function () {
    $this->actingAs($this->agent)
        ->getJson($this->url)
        ->assertOk()
        ->assertExactJson(['has_draft' => false]);
});

// Bản gốc: params.dig(:draft_message, :message) || '' — đã kiểm trên oracle,
// thiếu tham số vẫn ghi chuỗi rỗng nên has_draft vẫn true.
it('stores an empty draft when the param is missing', function () {
    $this->actingAs($this->agent)->patchJson($this->url, [])->assertOk();

    $this->actingAs($this->agent)
        ->getJson($this->url)
        ->assertOk()
        ->assertExactJson(['has_draft' => true, 'message' => '']);
});

it('removes the draft message for the conversation', function () {
    ConversationDraftMessage::put($this->conversation->id, 'a draft in progress');

    $this->actingAs($this->agent)->deleteJson($this->url)->assertOk();

    expect(ConversationDraftMessage::get($this->conversation->id))->toBeNull();
});

it('keys the draft by the conversation primary key, not the display id', function () {
    expect(ConversationDraftMessage::key($this->conversation->id))
        ->toBe("CONVERSATION::{$this->conversation->id}::DRAFT_MESSAGE");
});

it('returns unauthorized for an agent outside the inbox', function () {
    $outsider = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $outsider->id]);

    $this->actingAs($outsider)->getJson($this->url)->assertUnauthorized();
});

it('returns not found for a conversation of another account', function () {
    $otherAccount = Account::factory()->create();
    AccountUser::factory()->create(['account_id' => $otherAccount->id, 'user_id' => $this->agent->id]);

    $this->actingAs($this->agent)
        ->getJson("/api/v1/accounts/{$otherAccount->id}/conversations/{$this->conversation->display_id}/draft_messages")
        ->assertNotFound();
});
