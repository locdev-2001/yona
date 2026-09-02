<?php

use App\Finders\MessageFinder;
use App\Models\Conversation;
use App\Models\Message;

// Port từ spec/finders/message_finder_spec.rb.
// Khác bản gốc: outgoing message ở đây không sinh thêm 2 tin từ email hook
// (F1 chưa port) nên tổng số tin đếm theo dữ liệu thật của test; bổ sung
// 1 private note để phủ nhánh loại private của filter_internal_messages.

function messageFinderSetup(): Conversation
{
    $conversation = Conversation::factory()->create();
    $attributes = [
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
    ];

    // Thứ tự created_at cách nhau 1 giây để sort ổn định (cột timestamp giây).
    Message::factory()->create([...$attributes, 'created_at' => now()->subSeconds(50)]);
    Message::factory()->activity()->create([...$attributes, 'created_at' => now()->subSeconds(40)]);
    Message::factory()->activity()->create([...$attributes, 'created_at' => now()->subSeconds(30)]);
    Message::factory()->outgoing()->create([...$attributes, 'created_at' => now()->subSeconds(20), 'private' => true]);
    Message::factory()->outgoing()->create([...$attributes, 'created_at' => now()->subSeconds(10)]);

    return $conversation;
}

describe('perform', function () {
    it('returns every message with filter_internal_messages false', function () {
        $conversation = messageFinderSetup();

        $result = (new MessageFinder($conversation, ['filter_internal_messages' => false]))->perform();

        expect($result)->toHaveCount(5);
    });

    it('hides private and activity messages with filter_internal_messages true', function () {
        $conversation = messageFinderSetup();

        $result = (new MessageFinder($conversation, ['filter_internal_messages' => true]))->perform();

        expect($result)->toHaveCount(2)
            ->and($result->pluck('message_type')->all())->toBe([Message::TYPE_INCOMING, Message::TYPE_OUTGOING]);
    });

    it('returns the latest 20 messages in ascending order by default', function () {
        $conversation = messageFinderSetup();
        $attributes = [
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'conversation_id' => $conversation->id,
        ];
        foreach (range(1, 20) as $offset) {
            Message::factory()->create([...$attributes, 'created_at' => now()->addSeconds($offset)]);
        }

        $result = (new MessageFinder($conversation, []))->perform();
        $allIdsAscending = $conversation->messages()->pluck('id')->all();

        expect($result)->toHaveCount(20)
            ->and($result->pluck('id')->all())->toBe(array_slice($allIdsAscending, -20));
    });

    it('returns messages before the given id', function () {
        $conversation = messageFinderSetup();
        $lastMessage = Message::factory()->outgoing()->create([
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'conversation_id' => $conversation->id,
            'created_at' => now(),
        ]);

        $result = (new MessageFinder($conversation, ['before' => $lastMessage->id]))->perform();

        expect($result)->toHaveCount(5)
            ->and($result->pluck('id'))->not->toContain($lastMessage->id);
    });

    it('includes the maximum valid message id when before is above the id range', function () {
        $conversation = messageFinderSetup();
        $maxIdMessage = Message::factory()->create([
            'id' => MessageFinder::MESSAGE_ID_MAX,
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'conversation_id' => $conversation->id,
            'created_at' => now(),
        ]);

        $result = (new MessageFinder($conversation, ['before' => 4611686018427387903]))->perform();

        expect($result->pluck('id'))->toContain($maxIdMessage->id);
    });

    it('returns messages after the given id in ascending order', function () {
        $conversation = messageFinderSetup();
        $messageIds = $conversation->messages()->pluck('id')->all();

        $result = (new MessageFinder($conversation, ['after' => $messageIds[0]]))->perform();

        expect($result)->toHaveCount(4)
            ->and($result->first()->id)->toBe($messageIds[1])
            ->and($result->last()->message_type)->toBe(Message::TYPE_OUTGOING);
    });

    it('returns no messages when after is above the id range', function () {
        $conversation = messageFinderSetup();

        $result = (new MessageFinder($conversation, ['after' => 881965304328]))->perform();

        expect($result)->toBeEmpty();
    });

    it('returns messages between after and before', function () {
        $conversation = messageFinderSetup();
        $messageIds = $conversation->messages()->pluck('id')->all();

        $result = (new MessageFinder($conversation, [
            'after' => $messageIds[0],
            'before' => end($messageIds),
        ]))->perform();

        expect($result)->toHaveCount(4)
            ->and($result->last()->id)->toBe($messageIds[count($messageIds) - 2]);
    });

    it('returns no messages when after and before are both above the id range', function () {
        $conversation = messageFinderSetup();
        $maxIdMessage = Message::factory()->create([
            'id' => MessageFinder::MESSAGE_ID_MAX,
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'conversation_id' => $conversation->id,
        ]);

        $result = (new MessageFinder($conversation, [
            'after' => 881965304328,
            'before' => 4611686018427387903,
        ]))->perform();

        expect($result)->toBeEmpty()
            ->and($result->pluck('id'))->not->toContain($maxIdMessage->id);
    });
});

// Chatwoot lưu created_at với micro-giây (timestamp(6)); nhiều tin cùng giây
// (API burst, bot, import) phải giữ đúng thứ tự tạo — equivalence với
// `default_scope { order(created_at: :asc) }` của Message gốc.
describe('ordering within the same second', function () {
    it('stores microseconds and orders messages created in the same second by creation time', function () {
        $conversation = Conversation::factory()->create();
        $attributes = [
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'conversation_id' => $conversation->id,
        ];
        $base = now()->startOfSecond();

        // Chèn KHÔNG theo thứ tự thời gian để id không che được lỗi tie.
        $offsets = [355000, 228000, 314000, 271000];
        $idsByMicro = [];
        foreach ($offsets as $micro) {
            $message = Message::factory()->create([...$attributes, 'created_at' => $base->copy()->addMicroseconds($micro)]);
            $idsByMicro[$micro] = $message->id;
        }
        ksort($idsByMicro);

        $storedValue = DB::table('messages')->where('id', $idsByMicro[228000])->value('created_at');

        expect($storedValue)->toEndWith('.228')
            ->and(Message::query()->whereKey($idsByMicro[228000])->first()->created_at->micro)->toBe(228000)
            ->and((new MessageFinder($conversation, []))->perform()->pluck('id')->all())->toBe(array_values($idsByMicro))
            ->and($conversation->messages()->pluck('id')->all())->toBe(array_values($idsByMicro));
    });
});
