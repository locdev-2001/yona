<?php

use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Team;
use App\Models\User;

// Port từ spec/controllers/api/v2/accounts/live_reports_controller_spec.rb.

beforeEach(function () {
    $this->inbox = Inbox::factory()->create();
    $this->account = $this->inbox->account;

    $this->admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $this->account->id, 'user_id' => $this->admin->id]);

    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);

    $this->team = Team::factory()->create(['account_id' => $this->account->id]);
    $this->url = "/api/v2/accounts/{$this->account->id}/live_reports";
});

function d2LiveConversation(array $attributes = []): Conversation
{
    return Conversation::factory()->create(array_replace([
        'account_id' => test()->account->id,
        'inbox_id' => test()->inbox->id,
    ], $attributes));
}

it('rejects agents', function () {
    $this->actingAs($this->agent)->getJson($this->url.'/conversation_metrics')->assertUnauthorized();
});

it('counts open, unattended, unassigned and pending conversations', function () {
    // waiting_since do before_create đặt — phải xóa sau khi tạo mới là "đã chăm sóc".
    d2LiveConversation(['assignee_id' => $this->agent->id, 'first_reply_created_at' => now()])
        ->update(['waiting_since' => null]);
    d2LiveConversation();
    d2LiveConversation(['status' => Conversation::STATUS_PENDING]);
    d2LiveConversation(['status' => Conversation::STATUS_RESOLVED]);

    $payload = $this->actingAs($this->admin)->getJson($this->url.'/conversation_metrics')->assertOk()->json();

    expect($payload)->toBe(['open' => 2, 'unattended' => 1, 'unassigned' => 1, 'pending' => 1]);
});

it('restricts the counts to one team', function () {
    d2LiveConversation(['team_id' => $this->team->id]);
    d2LiveConversation();

    $payload = $this->actingAs($this->admin)
        ->getJson($this->url."/conversation_metrics?team_id={$this->team->id}")
        ->assertOk()
        ->json();

    expect($payload['open'])->toBe(1);
});

it('groups the open counts by assignee', function () {
    d2LiveConversation(['assignee_id' => $this->agent->id]);
    d2LiveConversation(['assignee_id' => $this->agent->id]);
    d2LiveConversation();

    $payload = $this->actingAs($this->admin)
        ->getJson($this->url.'/grouped_conversation_metrics?group_by=assignee_id')
        ->assertOk()
        ->json();

    $assigned = collect($payload)->firstWhere('assignee_id', $this->agent->id);
    $unassigned = collect($payload)->firstWhere('assignee_id', null);

    expect($assigned['open'])->toBe(2)
        ->and($assigned['unassigned'])->toBe(0)
        ->and($unassigned['open'])->toBe(1)
        ->and($unassigned['unassigned'])->toBe(1);
});

it('refuses an unsupported grouping', function () {
    $this->actingAs($this->admin)
        ->getJson($this->url.'/grouped_conversation_metrics?group_by=inbox_id')
        ->assertStatus(422)
        ->assertJson(['error' => 'invalid group_by']);
});
