<?php

use App\Jobs\Webhooks\TelegramEventsJob;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use Illuminate\Support\Facades\Http;
use Tests\Feature\Channels\ChannelFixture;

// Map lựa chọn nhận từ nút/chip gốc của kênh về tin gốc qua SubmissionService
// (phase-06 §6a "Map câu trả lời về lựa chọn"): Telegram callback_query.data,
// FB quick_reply.payload — cả hai không tạo tin đến mang payload thô, không
// còn rơi xuống thành chữ tự do như trước khi có DeliveryPlanner.

function structuredQuestion(Conversation $conversation, array $items): Message
{
    return $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Chọn một cái nhé',
        'content_type' => Message::CONTENT_TYPES['input_select'],
        'content_attributes' => ['items' => $items],
    ]);
}

it('Telegram: callback_query hợp lệ ghi submitted_values, không tạo tin mang callback_data thô', function () {
    Http::fake(['api.telegram.org/*' => Http::response(['ok' => true, 'result' => []])]);
    $inbox = Inbox::factory()->telegram()->create();
    $conversation = Conversation::factory()->create(['account_id' => $inbox->account_id, 'inbox_id' => $inbox->id]);
    $conversation->contactInbox->update(['source_id' => '999']);
    $question = structuredQuestion($conversation, [['title' => 'Có', 'value' => 'yes'], ['title' => 'Không', 'value' => 'no']]);
    $countBefore = Message::count();

    (new TelegramEventsJob([
        'bot_token' => $inbox->channel->bot_token,
        'telegram' => [
            'callback_query' => [
                'id' => 'cbq-1',
                'data' => "{$question->id}:yes",
                'from' => ['id' => 999],
                'message' => ['chat' => ['id' => 999]],
            ],
        ],
    ]))->handle();

    expect($question->fresh()->content_attributes['submitted_values'])->toBe([['title' => 'Có', 'value' => 'yes']])
        ->and(Message::query()->where('content', "{$question->id}:yes")->exists())->toBeFalse()
        ->and(Message::count())->toBe($countBefore + 1);

    Http::assertSent(fn ($request) => str_contains($request->url(), '/answerCallbackQuery')
        && $request['callback_query_id'] === 'cbq-1');
});

it('Telegram: callback_query của tin khác tenant bị bỏ qua', function () {
    Http::fake(['api.telegram.org/*' => Http::response(['ok' => true, 'result' => []])]);
    $inboxA = Inbox::factory()->telegram()->create();
    $inboxB = Inbox::factory()->telegram()->create();
    $conversationB = Conversation::factory()->create(['account_id' => $inboxB->account_id, 'inbox_id' => $inboxB->id]);
    $question = structuredQuestion($conversationB, [['title' => 'Có', 'value' => 'yes']]);

    (new TelegramEventsJob([
        'bot_token' => $inboxA->channel->bot_token,
        'telegram' => ['callback_query' => ['id' => 'cbq-2', 'data' => "{$question->id}:yes"]],
    ]))->handle();

    expect($question->fresh()->content_attributes)->not->toHaveKey('submitted_values');
});

it('Telegram: callback_data trỏ vào tin của khách khác cùng hộp thư bị bỏ qua', function () {
    Http::fake(['api.telegram.org/*' => Http::response(['ok' => true, 'result' => []])]);
    $inbox = Inbox::factory()->telegram()->create();
    $conversation = Conversation::factory()->create(['account_id' => $inbox->account_id, 'inbox_id' => $inbox->id]);
    $conversation->contactInbox->update(['source_id' => '999']);
    $question = structuredQuestion($conversation, [['title' => 'Có', 'value' => 'yes']]);

    (new TelegramEventsJob([
        'bot_token' => $inbox->channel->bot_token,
        'telegram' => ['callback_query' => ['id' => 'cbq-4', 'data' => "{$question->id}:yes", 'from' => ['id' => 555]]],
    ]))->handle();

    expect($question->fresh()->content_attributes)->not->toHaveKey('submitted_values');
});

it('Telegram: bấm lại lựa chọn đã trả lời thì bỏ qua êm, không văng lỗi', function () {
    Http::fake(['api.telegram.org/*' => Http::response(['ok' => true, 'result' => []])]);
    $inbox = Inbox::factory()->telegram()->create();
    $conversation = Conversation::factory()->create(['account_id' => $inbox->account_id, 'inbox_id' => $inbox->id]);
    $question = structuredQuestion($conversation, [['title' => 'Có', 'value' => 'yes'], ['title' => 'Không', 'value' => 'no']]);
    $conversation->contactInbox->update(['source_id' => '999']);
    $question->update(['content_attributes' => [...$question->content_attributes, 'submitted_values' => [['title' => 'Có', 'value' => 'yes']]]]);

    (new TelegramEventsJob([
        'bot_token' => $inbox->channel->bot_token,
        'telegram' => ['callback_query' => ['id' => 'cbq-3', 'data' => "{$question->id}:no", 'from' => ['id' => 999]]],
    ]))->handle();

    expect($question->fresh()->content_attributes['submitted_values'])->toBe([['title' => 'Có', 'value' => 'yes']]);
});

it('Facebook: quick_reply.payload yona:{id}:{value} ghi submitted_values, không tạo tin đến bình thường', function () {
    config()->set('services.facebook.app_secret', 'fb-secret');
    Http::fake(['graph.facebook.com/*' => Http::response([])]);
    $inbox = Inbox::factory()->facebookPage()->create();
    $inbox->channel->update(['page_id' => 'page-id']);
    $conversation = Conversation::factory()->create(['account_id' => $inbox->account_id, 'inbox_id' => $inbox->id]);
    $conversation->contactInbox->update(['source_id' => 'sender-psid']);
    $question = structuredQuestion($conversation, [['title' => 'Có', 'value' => 'yes'], ['title' => 'Không', 'value' => 'no']]);
    $countBefore = Message::count();

    $payload = ChannelFixture::load('facebook_messaging');
    $payload['entry'][0]['messaging'][0]['message'] = [
        'mid' => 'mid.facebook.qr',
        'quick_reply' => ['payload' => "yona:{$question->id}:no"],
    ];
    $body = json_encode($payload);

    test()->call('POST', '/bot', [], [], [], [
        'CONTENT_TYPE' => 'application/json',
        'HTTP_X_HUB_SIGNATURE_256' => 'sha256='.hash_hmac('sha256', $body, 'fb-secret'),
    ], $body)->assertOk();

    expect($question->fresh()->content_attributes['submitted_values'])->toBe([['title' => 'Không', 'value' => 'no']])
        ->and(Message::count())->toBe($countBefore + 1);
});

it('Facebook: bấm chip của câu đã trả lời thì tin khách vẫn tới nhân viên như tin thường', function () {
    config()->set('services.facebook.app_secret', 'fb-secret');
    Http::fake(['graph.facebook.com/*' => Http::response([])]);
    $inbox = Inbox::factory()->facebookPage()->create();
    $inbox->channel->update(['page_id' => 'page-id']);
    $conversation = Conversation::factory()->create(['account_id' => $inbox->account_id, 'inbox_id' => $inbox->id]);
    $conversation->contactInbox->update(['source_id' => 'sender-psid']);
    $question = structuredQuestion($conversation, [['title' => 'Có', 'value' => 'yes'], ['title' => 'Không', 'value' => 'no']]);
    $question->update(['content_attributes' => [...$question->content_attributes, 'submitted_values' => [['title' => 'Có', 'value' => 'yes']]]]);

    $payload = ChannelFixture::load('facebook_messaging');
    $payload['entry'][0]['messaging'][0]['message'] = [
        'mid' => 'mid.facebook.qr-late',
        'text' => 'Không',
        'quick_reply' => ['payload' => "yona:{$question->id}:no"],
    ];
    $body = json_encode($payload);

    test()->call('POST', '/bot', [], [], [], [
        'CONTENT_TYPE' => 'application/json',
        'HTTP_X_HUB_SIGNATURE_256' => 'sha256='.hash_hmac('sha256', $body, 'fb-secret'),
    ], $body)->assertOk();

    expect($question->fresh()->content_attributes['submitted_values'])->toBe([['title' => 'Có', 'value' => 'yes']])
        ->and(Message::query()->where('source_id', 'mid.facebook.qr-late')->where('content', 'Không')->exists())->toBeTrue();
});
