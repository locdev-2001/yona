<?php

namespace App\Agent\Runtime;

use App\Agent\Contracts\Ports\ConversationReader;
use App\Agent\ValueObjects\CoreMessage;
use App\Agent\ValueObjects\MessageOrigin;
use DateTimeImmutable;

// Bảng điều kiện duy nhất trước khi đi tiếp. checkTurn trước mỗi lần gọi mô hình;
// checkSend ngay trước khi gửi (thêm cửa sổ kênh và tin mới của khách/tin tự động).
// Tin mới hơn snapshot trả kèm để Runtime đưa vào lượt.
final class SendGate
{
    // Đủ lớn cho mọi tin dồn trong một lượt; quá thì lượt kế tiếp lo phần còn lại.
    private const PENDING_LIMIT = 50;

    private const HUMAN_ORIGINS = [MessageOrigin::Staff, MessageOrigin::ChannelEcho];

    private const STEERABLE_ORIGINS = [MessageOrigin::Customer, MessageOrigin::Automation];

    public function __construct(
        private readonly ConversationReader $reader,
        private readonly TurnSettings $settings,
    ) {}

    public function checkTurn(Turn $turn, DateTimeImmutable $now): GateCheck
    {
        $snapshot = $this->reader->conversation($turn->context->conversation);

        $block = match (true) {
            ! $this->settings->enabled => BlockReason::KillSwitch,
            $snapshot === null => BlockReason::ConversationGone,
            ! $snapshot->accountActive => BlockReason::KillSwitch,
            $snapshot->aiAgentId !== $turn->context->aiAgentId => BlockReason::AutoReplyOff,
            $snapshot->assigneeUserId !== $turn->assigneeUserId => BlockReason::Reassigned,
            $snapshot->floorHeldUntil === null || $snapshot->floorHeldUntil <= $now => BlockReason::FloorLost,
            default => null,
        };

        if ($block !== null) {
            return new GateCheck($block, []);
        }

        $pending = $this->reader->messagesAfter($turn->context->conversation, $turn->context->snapshotMessageId, self::PENDING_LIMIT);

        if ($this->any($pending, self::HUMAN_ORIGINS)) {
            return new GateCheck(BlockReason::HumanJoined, $pending);
        }

        return new GateCheck($snapshot->canReply ? null : BlockReason::WindowClosed, $pending);
    }

    public function checkSend(Turn $turn, DateTimeImmutable $now): GateCheck
    {
        $check = $this->checkTurn($turn, $now);

        if ($check->block === null && $this->any($check->pending, self::STEERABLE_ORIGINS)) {
            return new GateCheck(BlockReason::NewMessages, $check->pending);
        }

        return $check;
    }

    /**
     * @param  list<CoreMessage>  $messages
     * @param  list<MessageOrigin>  $origins
     */
    private function any(array $messages, array $origins): bool
    {
        foreach ($messages as $message) {
            if (! $message->private && in_array($message->origin, $origins, true)) {
                return true;
            }
        }

        return false;
    }
}
