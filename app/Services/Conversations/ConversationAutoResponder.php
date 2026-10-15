<?php

namespace App\Services\Conversations;

use App\Exceptions\Conversations\AutoResponderUnavailable;
use App\Jobs\Conversations\ActivityMessageJob;
use App\Models\AiAgent;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Facades\DB;

// Chỗ DUY NHẤT bật/tắt trả lời tự động của hội thoại. AI trả lời là AI agent của inbox,
// đang bật (Inbox::replyingAiAgent). Đổi cột qua model nên `conversation.updated` (realtime,
// webhook, automation) phát với changed_attributes có `ai_auto_reply`. Tắt thì nhả
// luôn quyền nói đang giữ.
final class ConversationAutoResponder
{
    /** @throws AutoResponderUnavailable */
    public function enable(Conversation $conversation, ?User $actor = null): void
    {
        $aiAgent = $conversation->inbox->replyingAiAgent()->first() ?? throw AutoResponderUnavailable::noReplyingAiAgent();

        if ($this->switchTo($conversation, true)) {
            $this->recordActivity($conversation, $actor === null ? 'enabled_by_system' : 'enabled', $actor, $aiAgent);
        }
    }

    public function disable(Conversation $conversation, AutoResponderStopReason $reason, ?User $actor = null): void
    {
        if (! $this->switchTo($conversation, false)) {
            return;
        }

        $key = $reason === AutoResponderStopReason::HumanJoined && $actor === null
            ? 'stopped.human_joined_from_channel'
            : 'stopped.'.$reason->value;

        $this->recordActivity($conversation, $key, $actor, $conversation->inbox->aiAgent()->first());
    }

    // Tin công khai của người (trong Yona hoặc echo từ ứng dụng kênh) = người tham gia.
    public function handOverToHumanAfter(Message $message): void
    {
        $conversation = $message->conversation;

        if (! $conversation->ai_auto_reply || $message->private || ! $message->isHumanResponse()) {
            return;
        }

        $this->disable($conversation, AutoResponderStopReason::HumanJoined, $message->sender instanceof User ? $message->sender : null);
    }

    private function switchTo(Conversation $conversation, bool $enabled): bool
    {
        return DB::transaction(function () use ($conversation, $enabled) {
            $locked = Conversation::query()->whereKey($conversation->id)->lockForUpdate()->firstOrFail();

            if ($locked->ai_auto_reply === $enabled) {
                return false;
            }

            $locked->forceFill(['ai_auto_reply' => $enabled, 'floor_held_until' => null])->save();
            $conversation->setRawAttributes($locked->getAttributes(), true);

            return true;
        });
    }

    private function recordActivity(Conversation $conversation, string $key, ?User $actor, ?AiAgent $aiAgent): void
    {
        $content = $conversation->inAccountLocale(fn () => __("conversations.activity.auto_responder.{$key}", [
            'user_name' => $actor?->name,
            'agent_name' => $aiAgent?->name ?? 'AI',
        ]));

        ActivityMessageJob::dispatch($conversation, $conversation->activityMessageParams($content, [
            'activity' => ['type' => 'auto_responder_changed', 'ai_auto_reply' => $conversation->ai_auto_reply],
        ]));
    }
}
