<?php

namespace App\Services\Zalo;

use App\Models\Inbox;
use App\Models\Message;

/**
 * Sự kiện trạng-thái-tin của bridge (undo / reaction / seen / delivered) đi THEO
 * chính bản ghi tin, ghi vào `content_attributes` — đúng cách Chatwoot giữ
 * `external_error`, `in_reply_to_external_id`… trên cột đó thay vì bảng riêng.
 * Port từ MessageStatusService + ZaloStateEventParser của nhánh `main`.
 */
class MessageStateService
{
    /** @param array<string, mixed> $payload */
    public function applyRecall(Inbox $inbox, array $payload): bool
    {
        $message = $this->findMessage($inbox, $this->targetSourceId($payload));

        if ($message === null) {
            return false;
        }

        $message->update([
            'content' => null,
            'content_attributes' => [...$message->content_attributes ?? [], 'deleted' => true],
        ]);

        return true;
    }

    /** @param array<string, mixed> $payload */
    public function applyReaction(Inbox $inbox, array $payload): bool
    {
        $message = $this->findMessage($inbox, $this->targetSourceId($payload));

        if ($message === null) {
            return false;
        }

        $icon = $payload['icon'] ?? $payload['rIcon'] ?? ($payload['content']['rIcon'] ?? null);
        $reactions = $message->content_attributes['reactions'] ?? [];

        if (blank($icon)) {
            $reactions = [];
        } else {
            $reactions = [...array_values(array_diff($reactions, [(string) $icon])), (string) $icon];
        }

        $message->update([
            'content_attributes' => [...$message->content_attributes ?? [], 'reactions' => $reactions],
        ]);

        return true;
    }

    /**
     * Biên nhận `seen`/`delivered` áp cho các tin đi trong luồng — mất một biên
     * nhận không mất nghiệp vụ nên chỉ cập nhật những tin tìm được.
     *
     * @param  list<string>  $sourceIds
     */
    public function applyReceipts(Inbox $inbox, array $sourceIds, string $kind): int
    {
        $status = $kind === 'seen' ? Message::STATUSES['read'] : Message::STATUSES['delivered'];

        return Message::query()
            ->where('inbox_id', $inbox->id)
            ->whereIn('source_id', array_filter($sourceIds))
            ->update(['status' => $status]);
    }

    /** @param array<string, mixed> $payload */
    private function targetSourceId(array $payload): ?string
    {
        $candidates = [
            $payload['msgId'] ?? null,
            $payload['source_id'] ?? null,
            $payload['content']['msgId'] ?? null,
            $payload['data']['msgId'] ?? null,
        ];

        foreach ($candidates as $candidate) {
            if (filled($candidate)) {
                return (string) $candidate;
            }
        }

        return null;
    }

    private function findMessage(Inbox $inbox, ?string $sourceId): ?Message
    {
        return $sourceId === null
            ? null
            : Message::query()->where('inbox_id', $inbox->id)->where('source_id', $sourceId)->first();
    }
}
