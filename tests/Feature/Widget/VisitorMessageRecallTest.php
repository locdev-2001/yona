<?php

use App\Models\Attachment;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Message;
use Tests\Support\WidgetSession;

// Khách tự thu hồi tin của mình từ widget: DELETE /api/v1/widget/messages/{id}.

function recallConversationFor(WidgetSession $session, ?ContactInbox $contactInbox = null): Conversation
{
    $contactInbox ??= $session->contactInbox;

    return Conversation::factory()->create([
        'account_id' => $session->account->id,
        'inbox_id' => $session->inbox->id,
        'contact_id' => $contactInbox->contact_id,
        'contact_inbox_id' => $contactInbox->id,
    ]);
}

/** @param array<string, mixed> $attributes */
function recallMessageIn(Conversation $conversation, array $attributes = []): Message
{
    return Message::factory()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
        'message_type' => Message::TYPE_INCOMING,
        'content' => 'tin của khách',
        ...$attributes,
    ]);
}

beforeEach(function () {
    $this->session = WidgetSession::make(contactAttributes: ['email' => null]);
    $this->conversation = recallConversationFor($this->session);
});

it('thu hồi tin của chính khách còn trong hạn qua Message::markDeleted', function () {
    $message = recallMessageIn($this->conversation);
    $message->attachments()->create([
        'account_id' => $message->account_id,
        'file_type' => Attachment::FILE_TYPE_IMAGE,
        'external_url' => 'https://example.com/anh.png',
    ]);
    $this->travel(4)->minutes();
    $this->travel(59)->seconds();

    $response = $this->deleteJson($this->session->url("messages/{$message->id}"), [], $this->session->headers())
        ->assertOk();

    $message->refresh();
    expect($message->isDeleted())->toBeTrue()
        ->and($message->content)->toBe(__('conversations.messages.deleted', [], $this->session->account->locale))
        ->and($message->attachments()->count())->toBe(0)
        ->and($response->json('id'))->toBe($message->id)
        ->and($response->json('content_attributes.deleted'))->toBeTrue()
        ->and($response->json('content_type'))->toBe('text')
        ->and($response->json('attachments'))->toBeNull();
});

it('từ chối 422 với mã lý do khi tin không còn thu hồi được', function (Closure $prepare, string $code) {
    $message = $prepare($this->conversation);

    $this->deleteJson($this->session->url("messages/{$message->id}"), [], $this->session->headers())
        ->assertStatus(422)
        ->assertJson(['code' => $code, 'error' => __("errors.widget_recall.{$code}")]);
})->with([
    'quá hạn thu hồi của kênh' => [function (Conversation $conversation) {
        $message = recallMessageIn($conversation);
        test()->travel(5)->minutes();

        return $message;
    }, 'recall_window_expired'],
    'tin của agent' => [fn (Conversation $conversation) => recallMessageIn($conversation, ['message_type' => Message::TYPE_OUTGOING]), 'not_own_message'],
    'tin mẫu của hệ thống' => [fn (Conversation $conversation) => recallMessageIn($conversation, ['message_type' => Message::TYPE_TEMPLATE]), 'not_own_message'],
    'tin đã thu hồi' => [function (Conversation $conversation) {
        $message = recallMessageIn($conversation);
        $message->markDeleted();

        return $message;
    }, 'already_recalled'],
]);

it('tin bị từ chối thu hồi được giữ nguyên', function () {
    $message = recallMessageIn($this->conversation, ['message_type' => Message::TYPE_OUTGOING, 'content' => 'agent trả lời']);

    $this->deleteJson($this->session->url("messages/{$message->id}"), [], $this->session->headers())->assertStatus(422);

    expect($message->fresh()->content)->toBe('agent trả lời')
        ->and($message->fresh()->isDeleted())->toBeFalse();
});

it('không thu hồi được tin trong hội thoại của khách khác', function () {
    $otherContact = Contact::factory()->create(['account_id' => $this->session->account->id, 'email' => null]);
    $otherContactInbox = ContactInbox::factory()->create(['contact_id' => $otherContact->id, 'inbox_id' => $this->session->inbox->id]);
    $foreign = recallMessageIn(recallConversationFor($this->session, $otherContactInbox));

    $this->deleteJson($this->session->url("messages/{$foreign->id}"), [], $this->session->headers())->assertNotFound();

    expect($foreign->fresh()->isDeleted())->toBeFalse();
});

it('cấu hình widget lộ hạn thu hồi của kênh', function () {
    $config = $this->postJson($this->session->url('config'), [], $this->session->headers())->assertOk()->json();

    expect($config['website_channel_config']['recall_window'])
        ->toBe((int) $this->session->channel->recallWindow()->totalSeconds)
        ->toBe(300);
});
