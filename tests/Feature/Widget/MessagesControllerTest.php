<?php

use App\Builders\Messages\MessageBuilder;
use App\Jobs\Conversations\ActivityMessageJob;
use App\Models\Attachment;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\CsatSurveyResponse;
use App\Models\Label;
use App\Models\Message;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\Support\WidgetSession;

// Port từ spec/controllers/api/v1/widget/messages_controller_spec.rb.

function widgetConversationFor(WidgetSession $session, ?ContactInbox $contactInbox = null): Conversation
{
    $contactInbox ??= $session->contactInbox;

    return Conversation::factory()->create([
        'account_id' => $session->account->id,
        'inbox_id' => $session->inbox->id,
        'contact_id' => $contactInbox->contact_id,
        'contact_inbox_id' => $contactInbox->id,
    ]);
}

describe('GET /api/v1/widget/messages', function () {
    it('returns the messages of the conversation', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $conversation = widgetConversationFor($session);
        Message::factory()->count(2)->create([
            'account_id' => $session->account->id,
            'inbox_id' => $session->inbox->id,
            'conversation_id' => $conversation->id,
        ]);

        $response = $this->getJson($session->url('messages'), $session->headers())->assertOk();

        // 2 tin tạo sẵn + 2 tin mẫu email-collect (khách chưa có email, kênh Website).
        expect($response->json('payload'))->toHaveCount(4);
        expect($response->json('meta.contact_last_seen_at'))->toBe(0);
    });

    // C5: sau khi hội thoại đóng và khách đã chấm điểm, tải lại widget vẫn phải
    // nhận được bong bóng khảo sát kèm điểm đã gửi để hiện ở trạng thái đã gửi.
    it('returns the resolved conversation csat message with the submitted rating', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $conversation = widgetConversationFor($session);
        $conversation->update(['status' => Conversation::STATUS_RESOLVED]);
        Message::factory()->create([
            'account_id' => $session->account->id,
            'inbox_id' => $session->inbox->id,
            'conversation_id' => $conversation->id,
            'message_type' => Message::TYPE_TEMPLATE,
            'content' => 'Please rate the conversation',
            'content_type' => Message::CONTENT_TYPES['input_csat'],
            'content_attributes' => [
                'display_type' => 'emoji',
                'submitted_values' => ['csat_survey_response' => ['rating' => 4, 'feedback_message' => 'phuc vu tot']],
            ],
        ]);

        $response = $this->getJson($session->url('messages'), $session->headers())->assertOk();

        $csat = collect($response->json('payload'))->firstWhere('content_type', 'input_csat');
        expect($csat)->not->toBeNull();
        expect($csat['content'])->toBe('Please rate the conversation');
        expect($csat['content_attributes']['display_type'])->toBe('emoji');
        expect($csat['content_attributes']['submitted_values'])
            ->toBe(['csat_survey_response' => ['rating' => 4, 'feedback_message' => 'phuc vu tot']]);
    });

    // Giá chuỗi của bot được lõi tin có cấu trúc chuẩn hoá thành số nguyên + tiền tệ,
    // không mất khi tới widget.
    it('keeps the optional price of each bot card on the way to the widget', function () {
        $session = WidgetSession::make();
        $conversation = widgetConversationFor($session);
        $items = [
            ['title' => 'Bàn nâng hạ Ergo M', 'description' => '120×60cm · gỗ sồi', 'price' => '4.290.000 ₫'],
            ['title' => 'Ghế lưới', 'description' => 'Lưới thoáng'],
        ];
        (new MessageBuilder(null, $conversation, [
            'content' => 'Có 2 mẫu đang bán chạy',
            'content_type' => 'cards',
            'content_attributes' => ['items' => $items],
        ]))->perform();

        $response = $this->getJson($session->url('messages'), $session->headers())->assertOk();

        $cards = collect($response->json('payload'))->firstWhere('content_type', 'cards');
        expect($cards['content_attributes']['items'][0]['price'])->toBe(['amount' => 4290000, 'currency' => 'VND'])
            ->and($cards['content_attributes']['items'][1])->not->toHaveKey('price');
    });

    it('returns an empty payload when the visitor has no conversation', function () {
        $session = WidgetSession::make();

        $response = $this->getJson($session->url('messages'), $session->headers())->assertOk();

        expect($response->json('payload'))->toHaveCount(0);
    });
});

describe('POST /api/v1/widget/messages', function () {
    it('rejects a message when the conversation is resolved and the inbox forbids it', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $session->inbox->update(['allow_messages_after_resolved' => false]);
        $conversation = widgetConversationFor($session);
        $conversation->update(['status' => Conversation::STATUS_RESOLVED]);

        $conversations = Conversation::query()->count();
        $messages = Message::query()->count();

        $this->postJson($session->url('messages'), ['message' => ['content' => 'hello world']], $session->headers())
            ->assertForbidden()
            ->assertJson(['error' => 'Conversation is resolved and does not accept new messages']);

        expect(Conversation::query()->count())->toBe($conversations);
        expect(Message::query()->count())->toBe($messages);
    });

    it('accepts a message when the inbox allows messages after resolved', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $session->inbox->update(['allow_messages_after_resolved' => true]);
        $conversation = widgetConversationFor($session);
        $conversation->update(['status' => Conversation::STATUS_RESOLVED]);

        $conversations = Conversation::query()->count();

        $this->postJson($session->url('messages'), ['message' => ['content' => 'hello world']], $session->headers())
            ->assertOk();

        expect(Conversation::query()->count())->toBe($conversations);
        expect($conversation->messages()->incoming()->reorder('id', 'desc')->first()->content)->toBe('hello world');
    });

    it('creates the conversation together with the first message', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);

        $response = $this->postJson(
            $session->url('messages'),
            ['message' => ['content' => 'hello world', 'timestamp' => now()->toString()]],
            $session->headers()
        )->assertOk();

        expect($response->json('content'))->toBe('hello world');
        expect($response->json('message_type'))->toBe(Message::TYPE_INCOMING);
        expect($session->contact->conversations()->count())->toBe(1);
    });

    it('applies custom attributes when the first message creates the conversation', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);

        $this->postJson($session->url('messages'), [
            'message' => ['content' => 'hello world'],
            'custom_attributes' => ['plan' => 'enterprise', 'source' => 'website'],
        ], $session->headers())->assertOk();

        expect($session->contact->conversations()->reorder('id', 'desc')->first()->custom_attributes)
            ->toMatchArray(['plan' => 'enterprise', 'source' => 'website']);
    });

    it('applies known labels and ignores unknown ones on the first message', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        Label::factory()->create(['account_id' => $session->account->id, 'title' => 'vip']);

        $this->postJson($session->url('messages'), [
            'message' => ['content' => 'hello world'],
            'labels' => ['vip', 'nonexistent'],
        ], $session->headers())->assertOk();

        $conversation = $session->contact->conversations()->reorder('id', 'desc')->first();

        expect($conversation->labelList())->toBe(['vip']);
    });

    it('does not apply labels or custom attributes when the conversation already exists', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        Label::factory()->create(['account_id' => $session->account->id, 'title' => 'vip']);
        $conversation = widgetConversationFor($session);

        $this->postJson($session->url('messages'), [
            'message' => ['content' => 'hello world'],
            'custom_attributes' => ['plan' => 'enterprise'],
            'labels' => ['vip'],
        ], $session->headers())->assertOk();

        expect($conversation->fresh()->custom_attributes ?? [])->not->toHaveKey('plan');
        expect($conversation->labelList())->toBe([]);
    });

    it('rejects content longer than the limit', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);

        $this->postJson(
            $session->url('messages'),
            ['message' => ['content' => str_repeat('h', 150 * 1000).'a']],
            $session->headers()
        )
            ->assertStatus(422)
            ->assertJson(['message' => 'Content is too long (maximum is 150000 characters)']);
    });

    it('keeps a valid reply_to and drops an unknown one', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $conversation = widgetConversationFor($session);
        $first = Message::factory()->create([
            'account_id' => $session->account->id,
            'inbox_id' => $session->inbox->id,
            'conversation_id' => $conversation->id,
        ]);

        $valid = $this->postJson(
            $session->url('messages'),
            ['message' => ['content' => 'hello world reply', 'reply_to' => $first->id]],
            $session->headers()
        )->assertOk();

        expect($valid->json('content_attributes.in_reply_to'))->toBe($first->id);
        expect($valid->json('content_attributes.in_reply_to_external_id'))->toBeNull();

        $invalid = $this->postJson(
            $session->url('messages'),
            ['message' => ['content' => 'hello world reply', 'reply_to' => $first->id + 300]],
            $session->headers()
        )->assertOk();

        expect($invalid->json('content_attributes.in_reply_to'))->toBeNull();
    });

    it('creates an attachment message', function () {
        Storage::fake('local');
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $conversation = widgetConversationFor($session);

        $this->post($session->url('messages'), [
            'message' => [
                'content' => 'hello world',
                'attachments' => [UploadedFile::fake()->image('avatar.png')],
            ],
        ], $session->headers())->assertOk();

        $attachment = $conversation->messages()->incoming()->reorder('id', 'desc')->first()->attachments->first();

        expect($attachment)->not->toBeNull();
        expect($attachment->file_type)->toBe(Attachment::FILE_TYPE_IMAGE);
    });

    it('does not reopen a muted conversation', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $session->inbox->update(['allow_messages_after_resolved' => true]);
        $conversation = widgetConversationFor($session);
        $conversation->mute();

        $this->postJson($session->url('messages'), ['message' => ['content' => 'hello world']], $session->headers())
            ->assertOk();

        expect($conversation->fresh()->isResolved())->toBeTrue();
    });

    it('reopens a snoozed conversation without a resolved activity message', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null, 'name' => 'trang']);
        $conversation = widgetConversationFor($session);
        $conversation->update(['status' => Conversation::STATUS_SNOOZED]);

        Queue::fake();

        $this->postJson($session->url('messages'), ['message' => ['content' => 'hello world']], $session->headers())
            ->assertOk();

        expect($conversation->fresh()->isOpen())->toBeTrue();
        Queue::assertNotPushed(
            ActivityMessageJob::class,
            fn (ActivityMessageJob $job) => str_contains($job->messageParams['content'], 'resolved')
        );
    });
});

describe('PATCH /api/v1/widget/messages/{id}', function () {
    it('does not update a message belonging to another visitor', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $otherContact = Contact::factory()->create(['account_id' => $session->account->id, 'email' => null]);
        $otherInbox = ContactInbox::factory()->create(['contact_id' => $otherContact->id, 'inbox_id' => $session->inbox->id]);
        $otherConversation = widgetConversationFor($session, $otherInbox);
        $foreign = Message::factory()->create([
            'account_id' => $session->account->id,
            'inbox_id' => $session->inbox->id,
            'conversation_id' => $otherConversation->id,
            'content_type' => Message::CONTENT_TYPES['input_email'],
        ]);

        $this->patchJson(
            $session->url("messages/{$foreign->id}"),
            ['contact' => ['email' => 'attacker@example.com']],
            $session->headers()
        )->assertNotFound();

        expect($foreign->fresh()->content_attributes['submitted_email'] ?? null)->toBeNull();
    });

    it('stores the submitted email and identifies the contact', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $conversation = widgetConversationFor($session);
        $message = Message::factory()->create([
            'account_id' => $session->account->id,
            'inbox_id' => $session->inbox->id,
            'conversation_id' => $conversation->id,
            'content_type' => Message::CONTENT_TYPES['input_email'],
        ]);

        $this->patchJson(
            $session->url("messages/{$message->id}"),
            ['contact' => ['email' => 'Visitor@Example.com']],
            $session->headers()
        )->assertOk();

        expect($message->fresh()->content_attributes['submitted_email'])->toBe('visitor@example.com');
        expect($session->contact->fresh()->email)->toBe('visitor@example.com');
        expect($session->contact->fresh()->name)->toBe('visitor');
    });

    it('survives a blank email without failing', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $conversation = widgetConversationFor($session);
        $message = Message::factory()->create([
            'account_id' => $session->account->id,
            'inbox_id' => $session->inbox->id,
            'conversation_id' => $conversation->id,
            'content_type' => Message::CONTENT_TYPES['input_email'],
        ]);

        $this->patchJson($session->url("messages/{$message->id}"), ['contact' => ['email' => null]], $session->headers())
            ->assertOk();
    });

    it('merges into an existing contact when the submitted email already exists', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $conversation = widgetConversationFor($session);
        $message = Message::factory()->create([
            'account_id' => $session->account->id,
            'inbox_id' => $session->inbox->id,
            'conversation_id' => $conversation->id,
            'content_type' => Message::CONTENT_TYPES['input_email'],
        ]);
        $existing = Contact::factory()->create([
            'account_id' => $session->account->id,
            'email' => 'john@example.com',
            'name' => 'John Doe',
        ]);

        $this->patchJson(
            $session->url("messages/{$message->id}"),
            ['contact' => ['email' => 'JOHN@EXAMPLE.COM']],
            $session->headers()
        )->assertOk();

        expect($existing->fresh()->name)->toBe('John Doe');
        expect(Contact::query()->whereKey($session->contact->id)->exists())->toBeFalse();
    });

    // continuity_via_email: khách điền lại email đã dùng ở phiên trước thì mọi
    // hội thoại cũ về chung một hồ sơ, agent không thấy hai người lạ.
    it('reattaches the earlier conversations of the same email', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $conversation = widgetConversationFor($session);
        $message = Message::factory()->create([
            'account_id' => $session->account->id,
            'inbox_id' => $session->inbox->id,
            'conversation_id' => $conversation->id,
            'content_type' => Message::CONTENT_TYPES['input_email'],
        ]);

        $known = Contact::factory()->create(['account_id' => $session->account->id, 'email' => 'john@example.com']);
        $knownInbox = ContactInbox::factory()->create(['contact_id' => $known->id, 'inbox_id' => $session->inbox->id]);
        $earlierConversation = widgetConversationFor($session, $knownInbox);

        $this->patchJson(
            $session->url("messages/{$message->id}"),
            ['contact' => ['email' => 'john@example.com']],
            $session->headers()
        )->assertOk();

        expect($conversation->fresh()->contact_id)->toBe($known->id);
        expect($earlierConversation->fresh()->contact_id)->toBe($known->id);
        expect($known->conversations()->count())->toBe(2);
    });

    it('stores submitted values for other content types', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $conversation = widgetConversationFor($session);
        $message = Message::factory()->create([
            'account_id' => $session->account->id,
            'inbox_id' => $session->inbox->id,
            'conversation_id' => $conversation->id,
            'content_type' => Message::CONTENT_TYPES['input_select'],
        ]);

        $this->patchJson(
            $session->url("messages/{$message->id}"),
            ['message' => ['submitted_values' => [['name' => 'plan', 'value' => 'pro']]]],
            $session->headers()
        )->assertOk();

        expect($message->fresh()->content_attributes['submitted_values'])->toBe([['name' => 'plan', 'value' => 'pro']]);
    });

    // C5: bong bóng khảo sát trong widget đi qua đúng endpoint này.
    it('records the csat rating submitted from the widget bubble', function () {
        $session = WidgetSession::make(contactAttributes: ['email' => null]);
        $conversation = widgetConversationFor($session);
        $message = Message::factory()->create([
            'account_id' => $session->account->id,
            'inbox_id' => $session->inbox->id,
            'conversation_id' => $conversation->id,
            'content_type' => Message::CONTENT_TYPES['input_csat'],
        ]);

        $this->patchJson(
            $session->url("messages/{$message->id}"),
            ['message' => ['submitted_values' => ['csat_survey_response' => ['rating' => 5, 'feedback_message' => 'great']]]],
            $session->headers()
        )->assertOk();

        $response = CsatSurveyResponse::sole();
        expect($response->rating)->toBe(5);
        expect($response->feedback_message)->toBe('great');
        expect($response->conversation_id)->toBe($conversation->id);
        expect($message->fresh()->content_attributes['submitted_values'])
            ->toBe(['csat_survey_response' => ['rating' => 5, 'feedback_message' => 'great']]);
    });
});
