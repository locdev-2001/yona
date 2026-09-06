<?php

namespace App\Services\Zalo;

use App\Models\Inbox;
use App\Models\Message;

/**
 * Sự kiện trạng-thái-tin của bridge (undo / reaction / seen / delivered) đi THEO
 * chính bản ghi tin, ghi vào `content_attributes` — đúng cách Chatwoot giữ
 * `external_error`, `in_reply_to_external_id`… trên cột đó thay vì bảng riêng.
 * Port từ MessageStatusService + ZaloStateEventParser của nhánh `main`.
 *
 * Nhận source_id đã bóc sẵn (RelayEventParser) — lớp này không biết hình dạng
 * payload của zca. Mọi cập nhật đi qua model (không phải query builder) để hook
 * `updated` phát `message.updated` cho realtime.
 */
class MessageStateService
{
    /** Chỉ NÂNG trạng thái; biên nhận đến trễ/lặp không được kéo tick lùi. */
    private const UPGRADABLE_STATUSES = [Message::STATUSES['sent'], Message::STATUSES['delivered']];

    /**
     * Thu hồi tin — theo đúng cách gốc đánh dấu tin bị xoá
     * (refs/chatwoot/app/controllers/api/v1/accounts/conversations/messages_controller.rb:23):
     * nội dung thay bằng chuỗi dịch, content_type về text, content_attributes chỉ còn `deleted`.
     */
    public function applyRecall(Inbox $inbox, ?string $sourceId): bool
    {
        $message = $this->findMessage($inbox, $sourceId);

        if ($message === null || ($message->content_attributes['deleted'] ?? false)) {
            return false;
        }

        $message->update([
            // Chuỗi sinh ở job nền — không có request để SetLocale chạy, nên lấy
            // thẳng ngôn ngữ của tài khoản sẽ đọc nó.
            'content' => __('conversations.messages.deleted', [], $inbox->account->locale),
            'content_type' => Message::CONTENT_TYPES['text'],
            'content_attributes' => ['deleted' => true],
        ]);

        return true;
    }

    /**
     * Cảm xúc trên tin. Mã rỗng = gỡ hết cảm xúc (zca `Reactions.NONE`).
     *
     * @param  list<array{source_id: string, icon: string}>  $reactions
     */
    public function applyReactions(Inbox $inbox, array $reactions): int
    {
        $applied = 0;

        foreach ($reactions as $reaction) {
            $message = $this->findMessage($inbox, $reaction['source_id']);

            if ($message === null) {
                continue;
            }

            $current = $message->content_attributes['reactions'] ?? [];
            $emoji = $reaction['icon'] === '' ? null : ReactionIcons::emoji($reaction['icon']);
            $next = $emoji === null
                ? []
                : [...array_values(array_diff($current, [$emoji])), $emoji];

            if ($next === $current) {
                continue;
            }

            $message->update([
                'content_attributes' => [...$message->content_attributes ?? [], 'reactions' => $next],
            ]);
            $applied++;
        }

        return $applied;
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

        $messages = Message::query()
            ->where('inbox_id', $inbox->id)
            ->whereIn('source_id', array_filter($sourceIds))
            ->whereIn('status', self::UPGRADABLE_STATUSES)
            ->where('status', '<', $status)
            ->get();

        foreach ($messages as $message) {
            $message->update(['status' => $status]);
        }

        return $messages->count();
    }

    private function findMessage(Inbox $inbox, ?string $sourceId): ?Message
    {
        return blank($sourceId)
            ? null
            : Message::query()->where('inbox_id', $inbox->id)->where('source_id', $sourceId)->first();
    }
}
