<?php

use App\Builders\Messages\MessageBuilder;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageAccessToken;
use App\Models\User;
use Tests\Support\WidgetSession;

// Widget xin URL trang công khai cho một hành động webview/order thay vì tự ghép
// (phase-05 §C): POST /api/v1/widget/messages/{id}/flow.

function flowLinkConversation(WidgetSession $session, ?ContactInbox $contactInbox = null): Conversation
{
    $contactInbox ??= $session->contactInbox;

    return Conversation::factory()->create([
        'account_id' => $session->account->id,
        'inbox_id' => $session->inbox->id,
        'contact_id' => $contactInbox->contact_id,
        'contact_inbox_id' => $contactInbox->id,
    ]);
}

function flowLinkWebview(Conversation $conversation, string $page): Message
{
    return (new MessageBuilder(User::factory()->create(), $conversation, [
        'content_type' => 'webview',
        'content_attributes' => ['page' => $page, 'title' => 'X', 'data' => []],
    ]))->perform();
}

beforeEach(function () {
    $this->session = WidgetSession::make(contactAttributes: ['email' => null]);
    $this->conversation = flowLinkConversation($this->session);
});

it('phát URL /m/{token} cho đúng trang của tin', function () {
    $message = flowLinkWebview($this->conversation, 'schedule');

    $response = $this->postJson(
        $this->session->url("messages/{$message->id}/flow"),
        ['page' => 'schedule'],
        $this->session->headers(),
    )->assertOk();

    $url = $response->json('url');
    expect($url)->toStartWith(url('/m/'))
        ->and(MessageAccessToken::query()->where('message_id', $message->id)->where('purpose', 'schedule')->exists())->toBeTrue();
});

it('404 khi trang xin không khớp trang thật của tin', function () {
    $message = flowLinkWebview($this->conversation, 'schedule');

    $this->postJson(
        $this->session->url("messages/{$message->id}/flow"),
        ['page' => 'bank_transfer'],
        $this->session->headers(),
    )->assertNotFound();
});

it('404 khi tin thuộc hội thoại của khách khác', function () {
    $otherContact = Contact::factory()->create(['account_id' => $this->session->account->id, 'email' => null]);
    $otherContactInbox = ContactInbox::factory()->create(['contact_id' => $otherContact->id, 'inbox_id' => $this->session->inbox->id]);
    $foreign = flowLinkWebview(flowLinkConversation($this->session, $otherContactInbox), 'schedule');

    $this->postJson(
        $this->session->url("messages/{$foreign->id}/flow"),
        ['page' => 'schedule'],
        $this->session->headers(),
    )->assertNotFound();
});
