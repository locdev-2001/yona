<?php

namespace App\Messaging\Inbound;

use App\Messaging\Inbound\Events\EditEvent;
use App\Messaging\Inbound\Events\InboundEvent;
use App\Messaging\Inbound\Events\ReactionEvent;
use App\Messaging\Inbound\Events\RecallEvent;
use App\Messaging\Inbound\Events\ReceiptEvent;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Messaging\MessageReceiptService;
use Illuminate\Support\Facades\Cache;

/**
 * Sự kiện của mọi kênh lên tin đã có. Mọi cập nhật đi qua model (không query builder)
 * để hook `updated` phát `message.updated` cho realtime.
 *
 * Tra tin theo `source_id`, hụt thì tra bí danh `external_source_ids`: một tin Yona gửi
 * đi có thể mang nhiều id ngoài (mỗi đính kèm một lượt gọi), sự kiện có thể trỏ vào
 * id của phần thứ hai.
 */
class MessageEventService
{
    /**
     * Khách gửi rồi thu hồi ngay: sự kiện thu hồi có thể tới TRƯỚC tin nó nói đến (hai
     * đường HTTP, hàng đợi khác nhau). Nhớ id đã thu hồi để tin tới sau bị đánh dấu ngay.
     */
    private const PENDING_RECALL_TTL_MINUTES = 30;

    public function __construct(private readonly MessageReceiptService $receipts) {}

    public function apply(Inbox $inbox, InboundEvent $event): bool
    {
        return match (true) {
            $event instanceof ReactionEvent => $this->applyReaction($inbox, $event),
            $event instanceof RecallEvent => $this->applyRecall($inbox, $event),
            $event instanceof EditEvent => $this->applyEdit($inbox, $event),
            $event instanceof ReceiptEvent => $this->applyReceipt($inbox, $event) > 0,
            default => false,
        };
    }

    /** Gọi ngay sau khi tin đến được ghi: thu hồi tới trước thì áp luôn. */
    public function applyPendingRecall(Inbox $inbox, ?string $sourceId): bool
    {
        if (blank($sourceId) || ! Cache::pull($this->pendingRecallKey($inbox, $sourceId))) {
            return false;
        }

        $message = $this->findMessage($inbox, $sourceId);

        if ($message === null || $message->isDeleted()) {
            return false;
        }

        $message->markDeleted($inbox->account->locale);

        return true;
    }

    private function applyReaction(Inbox $inbox, ReactionEvent $event): bool
    {
        $message = $this->findMessage($inbox, $event->targetSourceId);
        $by = $event->isSelf ? Message::REACTION_BY_AGENT_PREFIX.'self' : $event->actor;

        if ($message === null || blank($by)) {
            return false;
        }

        return $message->setReaction((string) $by, filled($event->emoji) ? $event->emoji : null);
    }

    private function applyRecall(Inbox $inbox, RecallEvent $event): bool
    {
        $message = $this->findMessage($inbox, $event->targetSourceId);

        if ($message === null) {
            Cache::put($this->pendingRecallKey($inbox, $event->targetSourceId), true, now()->addMinutes(self::PENDING_RECALL_TTL_MINUTES));

            return false;
        }

        if ($message->isDeleted()) {
            return false;
        }

        $message->markDeleted($inbox->account->locale);

        return true;
    }

    private function applyEdit(Inbox $inbox, EditEvent $event): bool
    {
        $message = $this->findMessage($inbox, $event->targetSourceId);

        if ($message === null || $message->isDeleted() || $message->content === $event->text) {
            return false;
        }

        $message->update([
            'content' => $event->text,
            'content_attributes' => [...($message->content_attributes ?? []), 'edited_at' => now()->getTimestamp()],
        ]);

        return true;
    }

    private function applyReceipt(Inbox $inbox, ReceiptEvent $event): int
    {
        if ($event->watermark !== null && $event->contactSourceId !== null) {
            return $this->receipts->applyUpTo($inbox, $event->contactSourceId, $event->watermark, $event->receipt);
        }

        return $this->receipts->applyToSourceIds($inbox, $event->sourceIds, $event->receipt);
    }

    private function pendingRecallKey(Inbox $inbox, string $sourceId): string
    {
        return "inbound:pending-recall:{$inbox->id}:{$sourceId}";
    }

    private function findMessage(Inbox $inbox, ?string $sourceId): ?Message
    {
        if (blank($sourceId)) {
            return null;
        }

        $message = Message::query()->where('inbox_id', $inbox->id)->where('source_id', $sourceId)->first();

        return $message ?? Message::query()
            ->where('inbox_id', $inbox->id)
            ->whereRaw("jsonb_exists((content_attributes)::jsonb -> 'external_source_ids', ?)", [$sourceId])
            ->first();
    }
}
