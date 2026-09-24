<?php

use App\Models\Account;
use App\Models\AgentBot;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;

// Bot dùng header api_access_token và chỉ vào
// được nhóm endpoint hội thoại/tin nhắn được phép.

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $this->bot = AgentBot::factory()->create(['account_id' => $this->account->id]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
    ]);
    $this->token = $this->bot->accessToken->token;
});

it('cho bot gửi tin và đổi trạng thái hội thoại', function () {
    $this->withHeader('api_access_token', $this->token)
        ->postJson(
            "/api/v1/accounts/{$this->account->id}/conversations/{$this->conversation->display_id}/messages",
            ['content' => 'Xin chào', 'message_type' => 'outgoing']
        )
        ->assertOk();

    $message = Message::query()->where('conversation_id', $this->conversation->id)->latest('id')->first();
    expect($message->sender_type)->toBe('AgentBot')
        ->and($message->sender_id)->toBe($this->bot->id);

    $this->withHeader('api_access_token', $this->token)
        ->postJson("/api/v1/accounts/{$this->account->id}/conversations/{$this->conversation->display_id}/toggle_status", [
            'status' => 'resolved',
        ])
        ->assertOk();

    expect($this->conversation->refresh()->status)->toBe(Conversation::STATUS_RESOLVED);
});

it('chặn bot ở các endpoint ngoài danh sách cho phép', function () {
    $this->withHeader('api_access_token', $this->token)
        ->getJson("/api/v1/accounts/{$this->account->id}/agent_bots")
        ->assertUnauthorized()
        ->assertJsonPath('error', 'Access to this endpoint is not authorized for bots');
});

it('chặn bot của account khác', function () {
    $foreignAccount = Account::factory()->create();

    $this->withHeader('api_access_token', $this->token)
        ->getJson("/api/v1/accounts/{$foreignAccount->id}/conversations/{$this->conversation->display_id}")
        ->assertNotFound();
});

it('trả 403 khi account tắt cờ api_and_webhooks', function () {
    $this->account->forceFill(['feature_flags' => ['api_and_webhooks' => false]])->save();

    $this->withHeader('api_access_token', $this->token)
        ->getJson("/api/v1/accounts/{$this->account->id}/conversations/{$this->conversation->display_id}")
        ->assertForbidden()
        ->assertJsonPath('error', 'API access is not enabled for this account');
});
