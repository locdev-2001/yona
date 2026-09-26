<?php

use App\Models\AccountUser;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Tests\Support\WidgetSession;

// Khách thả biểu cảm trên widget: POST/DELETE /api/v1/widget/messages/{id}/reactions.

function reactionConversation(WidgetSession $session, ?ContactInbox $contactInbox = null): Conversation
{
    $contactInbox ??= $session->contactInbox;

    return Conversation::factory()->create([
        'account_id' => $session->account->id,
        'inbox_id' => $session->inbox->id,
        'contact_id' => $contactInbox->contact_id,
        'contact_inbox_id' => $contactInbox->id,
    ]);
}

function agentMessageIn(Conversation $conversation): Message
{
    return Message::factory()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Dạ còn 2 cái ạ',
    ]);
}

beforeEach(function () {
    $this->session = WidgetSession::make(contactAttributes: ['email' => null]);
    $this->conversation = reactionConversation($this->session);
});

it('thả, đổi rồi gỡ: mỗi khách giữ một biểu cảm trên một tin', function () {
    $message = agentMessageIn($this->conversation);
    $url = $this->session->url("messages/{$message->id}/reactions");
    $by = 'contact:'.$this->session->contact->id;

    $this->postJson($url, ['emoji' => '👍'], $this->session->headers())
        ->assertOk()
        ->assertJsonPath('content_attributes.reactions.0.emoji', '👍')
        ->assertJsonPath('content_attributes.reactions.0.by', $by);

    $this->postJson($url, ['emoji' => '❤️'], $this->session->headers())->assertOk();
    expect($message->fresh()->reactionList())->toHaveCount(1)
        ->and($message->fresh()->reactionList()[0]['emoji'])->toBe('❤️');

    $this->deleteJson($url, [], $this->session->headers())->assertOk();
    expect($message->fresh()->reactionList())->toBe([]);
});

it('chỉ nhận emoji trong danh sách của widget', function () {
    $message = agentMessageIn($this->conversation);

    $this->postJson($this->session->url("messages/{$message->id}/reactions"), ['emoji' => '💩'], $this->session->headers())
        ->assertUnprocessable();

    expect($message->fresh()->reactionList())->toBe([]);
});

it('không thả được lên tin của khách khác hay tin đã thu hồi', function () {
    $stranger = ContactInbox::factory()->create(['inbox_id' => $this->session->inbox->id]);
    $foreign = agentMessageIn(reactionConversation($this->session, $stranger));
    $recalled = agentMessageIn($this->conversation);
    $recalled->update(['content_attributes' => ['deleted' => true]]);

    foreach ([$foreign, $recalled] as $message) {
        $this->postJson($this->session->url("messages/{$message->id}/reactions"), ['emoji' => '👍'], $this->session->headers())
            ->assertNotFound();
    }
});

it('agent thả biểu cảm trên hội thoại widget được, không còn 422 capability_not_supported', function () {
    $agent = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $this->session->account->id,
        'user_id' => $agent->id,
        'role' => AccountUser::ROLE_ADMINISTRATOR,
    ]);
    $message = Message::factory()->create([
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->conversation->inbox_id,
        'conversation_id' => $this->conversation->id,
        'message_type' => Message::TYPE_INCOMING,
        'content' => 'Còn hàng không shop?',
    ]);

    $this->actingAs($agent)
        ->postJson("/api/v1/accounts/{$this->session->account->id}/conversations/{$this->conversation->display_id}/messages/{$message->id}/reactions", ['emoji' => '❤️'])
        ->assertOk();

    expect($message->fresh()->reactionList()[0]['by'])->toBe(Message::REACTION_BY_AGENT_PREFIX.$agent->id);
});

it('cấu hình widget trả danh sách biểu cảm để thanh chọn khớp máy chủ', function () {
    $this->postJson($this->session->url('config'), [], $this->session->headers())
        ->assertOk()
        ->assertJsonPath('website_channel_config.reactions', config('messaging.widget_reactions'));
});
