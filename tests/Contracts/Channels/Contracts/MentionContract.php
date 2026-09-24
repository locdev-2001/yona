<?php

namespace Tests\Contracts\Channels\Contracts;

use App\Channels\Capability;
use App\Models\Message;
use Tests\Contracts\Channels\Harness\ChannelHarness;

/**
 * §2.2 outbound_mention — agent nhắc tên một thành viên nhóm bằng định danh trung
 * tính (`external_id` + `name` lấy từ `content_attributes.sender` của tin nhóm).
 * Lõi neo vị trí theo nội dung; driver phải mang định danh đó ra nền tảng.
 */
final class MentionContract extends ChannelContract
{
    public static function capability(): Capability
    {
        return Capability::OutboundMention;
    }

    public function assert(ChannelHarness $harness): void
    {
        $groupMessage = $harness->receiveInbound(Capability::GroupThreads);
        $member = $groupMessage->content_attributes['sender'] ?? [];
        expect($member['external_id'] ?? null)->not->toBeEmpty()
            ->and($member['name'] ?? null)->not->toBeEmpty();

        $conversation = $groupMessage->conversation;
        $needle = '@'.$member['name'];
        $reply = $conversation->messages()->create([
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'message_type' => Message::TYPE_OUTGOING,
            'content' => $needle.' xem giúp',
            'content_attributes' => ['mentions' => [['external_id' => $member['external_id'], 'name' => $member['name']]]],
        ]);

        expect($reply->content_attributes['mentions'])->toBe([[
            'external_id' => (string) $member['external_id'],
            'name' => $member['name'],
            'offset' => 0,
            'length' => mb_strlen($needle),
        ]])->and($harness->sendOutbound($this->readyToSend($reply))->flattened())->toContain((string) $member['external_id']);
    }
}
