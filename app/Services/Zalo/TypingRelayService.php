<?php

namespace App\Services\Zalo;

use App\Jobs\Zalo\StopTypingJob;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Services\Conversations\TypingStatusManager;
use Illuminate\Support\Facades\Cache;

/**
 * Sự kiện `typing` của Zalo → ống dẫn "đang nhập…" CÓ SẴN của lõi
 * (TypingStatusManager → `conversation.typing_on`), đúng đường mà widget website
 * đang dùng. Kênh chỉ nói "luồng này đang gõ"; lõi lo phần hiển thị.
 *
 * Zalo KHÔNG có sự kiện "thôi gõ", nên tự hẹn giờ tắt: mỗi lượt gõ đặt một dấu
 * thời gian rồi đẩy job tắt sau vài giây; job chỉ tắt khi dấu đó vẫn là dấu mới
 * nhất (khách gõ tiếp = dấu mới, job cũ tự bỏ).
 */
class TypingRelayService
{
    public const OFF_DELAY_SECONDS = 5;

    private const STAMP_TTL_MINUTES = 5;

    /** @param array<int|string, mixed> $relayPayload */
    public function handle(Inbox $inbox, array $relayPayload): bool
    {
        $threadId = RelayEventParser::typingThreadId($relayPayload);
        $conversation = $threadId === null ? null : $this->conversationOf($inbox, $threadId);

        if ($conversation === null) {
            return false;
        }

        $stamp = (string) now()->getPreciseTimestamp(3);
        Cache::put(self::stampKey($conversation), $stamp, now()->addMinutes(self::STAMP_TTL_MINUTES));

        $this->toggle($conversation, 'on');
        StopTypingJob::dispatch($conversation, $stamp)->delay(now()->addSeconds(self::OFF_DELAY_SECONDS));

        return true;
    }

    public static function stampKey(Conversation $conversation): string
    {
        return "zalo:typing-in:{$conversation->id}";
    }

    public function toggle(Conversation $conversation, string $status): void
    {
        // Người đang gõ là KHÁCH — cùng hình dạng payload widget gửi lên, nên FE
        // dashboard hiện bong bóng "đang nhập…" mà không cần biết đây là Zalo.
        (new TypingStatusManager($conversation, $conversation->contact, ['typing_status' => $status]))
            ->toggleTypingStatus();
    }

    /** Không tự tạo hội thoại: gõ mà chưa từng nhắn thì không có gì để hiện. */
    private function conversationOf(Inbox $inbox, string $threadId): ?Conversation
    {
        $contactInbox = $inbox->contactInboxes()->where('source_id', $threadId)->first();

        if ($contactInbox === null) {
            return null;
        }

        return $contactInbox->conversations()->where('status', '!=', Conversation::STATUS_RESOLVED)->latest('id')->first()
            ?? $contactInbox->conversations()->latest('id')->first();
    }
}
