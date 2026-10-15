<?php

namespace App\Services\Conversations;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Exceptions\Conversations\ConversationFloorHeld;
use App\Models\AgentBot;
use App\Models\AiAgent;
use App\Models\Conversation;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

// Quyền nói công khai trên hội thoại đang tự động. Chỉ AI trả lời của inbox
// (Inbox::replyingAiAgent) giữ được, tới một mốc; quá mốc là tự hết. Trong lúc giữ, tin
// công khai của người bị chặn tại assertMaySpeak — chỗ chặn duy nhất, gọi từ
// MessageBuilder. Tắt tự động (ConversationAutoResponder) xoá luôn mốc giữ.
//
// Nhả không hỏi ai đang giữ: mỗi hội thoại chỉ một lượt chạy một lúc và chỉ AI của inbox
// giữ được, nên lượt kết thúc luôn nhả được, kể cả khi AI vừa bị tắt, xoá hay thay.
// Inbox đổi AI trả lời thì releaseInbox nhả ngay mọi hội thoại của inbox.
final class ConversationFloor
{
    // Trần một lần giữ: người gọi xin dài hơn cũng chỉ được chừng này.
    public const MAX_HOLD_SECONDS = 300;

    public function acquire(Conversation $conversation, AiAgent $aiAgent, CarbonInterface $until): bool
    {
        $until = Carbon::instance($until)->min(now()->addSeconds(self::MAX_HOLD_SECONDS));

        if ($until->isPast() || ! $this->isReplyingAiAgent($conversation, $aiAgent)) {
            return false;
        }

        $held = Conversation::query()
            ->whereKey($conversation->id)
            ->where('ai_auto_reply', true)
            ->toBase()
            ->update(['floor_held_until' => $until]) === 1;

        if ($held) {
            $this->announce($conversation, $until);
        }

        return $held;
    }

    public function release(Conversation $conversation): void
    {
        $released = Conversation::query()
            ->whereKey($conversation->id)
            ->whereNotNull('floor_held_until')
            ->toBase()
            ->update(['floor_held_until' => null]) === 1;

        if ($released) {
            $this->announce($conversation, null);
        }
    }

    // Gọi SAU khi inbox đã đổi AI trả lời, để lượt cũ không giữ lại được.
    public function releaseInbox(int $inboxId): void
    {
        Conversation::query()
            ->where('inbox_id', $inboxId)
            ->whereNotNull('floor_held_until')
            ->get()
            ->each(fn (Conversation $conversation) => $this->release($conversation));
    }

    /** @throws ConversationFloorHeld */
    public function assertMaySpeak(Conversation $conversation, User|AgentBot|AiAgent|null $sender): void
    {
        // Automation, tin hệ thống và bot webhook cũ không bị chặn.
        if (! $sender instanceof User && ! $sender instanceof AiAgent) {
            return;
        }

        $current = Conversation::query()->whereKey($conversation->id)->first(['id', 'inbox_id', 'ai_auto_reply', 'floor_held_until']);
        $heldUntil = $current?->floorHeldUntil();

        if ($heldUntil === null || ($sender instanceof AiAgent && $this->isReplyingAiAgent($current, $sender))) {
            return;
        }

        throw new ConversationFloorHeld($heldUntil);
    }

    private function isReplyingAiAgent(Conversation $conversation, AiAgent $aiAgent): bool
    {
        return $conversation->inbox->replyingAiAgent()->value('id') === $aiAgent->id;
    }

    private function announce(Conversation $conversation, ?CarbonInterface $until): void
    {
        $conversation->setAttribute('floor_held_until', $until);
        $conversation->syncOriginalAttribute('floor_held_until');

        DomainEvent::dispatch(EventType::CONVERSATION_FLOOR_CHANGED, ['conversation' => $conversation]);
    }
}
