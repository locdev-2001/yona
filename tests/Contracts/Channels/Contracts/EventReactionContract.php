<?php

namespace Tests\Contracts\Channels\Contracts;

use App\Channels\Capability;
use App\Models\Message;
use Tests\Contracts\Channels\Harness\ChannelHarness;

/** §2.3 event_reaction — cảm xúc của khách ghi vào `content_attributes.reactions` của đúng tin, mang người thả. */
final class EventReactionContract extends ChannelContract
{
    public static function capability(): Capability
    {
        return Capability::EventReaction;
    }

    public function assert(ChannelHarness $harness): void
    {
        $conversation = $harness->conversation();
        $outgoing = $conversation->messages()->create([
            'account_id' => $conversation->account_id,
            'inbox_id' => $conversation->inbox_id,
            'message_type' => Message::TYPE_OUTGOING,
            'content' => 'tin chờ cảm xúc',
            'source_id' => 'contract-reaction-1',
            'status' => Message::STATUSES['sent'],
        ]);

        $harness->receiveEvent(self::capability(), $outgoing);

        $reactions = $outgoing->fresh()->reactionList();

        expect($reactions)->toHaveCount(1)
            ->and($reactions[0]['emoji'])->not->toBeEmpty()
            ->and($reactions[0]['by'])->not->toBe(Message::REACTION_BY_UNKNOWN);
    }
}
