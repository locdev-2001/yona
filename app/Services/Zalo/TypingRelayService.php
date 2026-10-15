<?php

namespace App\Services\Zalo;

use App\Jobs\Zalo\StopTypingJob;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Services\Conversations\GroupMembersService;
use App\Services\Conversations\TypingStatusManager;
use Illuminate\Support\Facades\Cache;

/**
 * Sự kiện `typing` của Zalo → ống dẫn "đang nhập…" CÓ SẴN của lõi
 * (TypingStatusManager → `conversation.typing_on`), đúng đường mà widget website
 * đang dùng. Kênh chỉ nói "luồng này đang gõ"; lõi lo phần hiển thị.
 *
 * Zalo KHÔNG có sự kiện "thôi gõ", nên tự hẹn giờ tắt: mỗi lượt gõ đặt một dấu
 * thời gian rồi đẩy job tắt sau vài giây; job chỉ tắt khi dấu đó vẫn là dấu mới
 * nhất (khách gõ tiếp = dấu mới, job cũ tự bỏ) — nghĩa là mỗi sự kiện typing mới
 * tự GIA HẠN cửa sổ chờ thay vì cộng dồn job tắt.
 *
 * Trong nhóm, liên hệ của hội thoại là cả nhóm nên người gõ được tra theo `uid`
 * thành viên; dấu thời gian cũng tách theo thành viên để hai người cùng gõ không
 * nuốt lượt tắt của nhau.
 */
class TypingRelayService
{
    /** Dùng khi cấu hình thiếu; giá trị thật ở `config/zalo.php` → `typing_off_delay`. */
    public const DEFAULT_OFF_DELAY_SECONDS = 10;

    private const STAMP_TTL_MINUTES = 5;

    public function __construct(private readonly GroupMembersService $groupMembers) {}

    /** @param array<int|string, mixed> $relayPayload */
    public function handle(Inbox $inbox, array $relayPayload): bool
    {
        $threadId = RelayEventParser::typingThreadId($relayPayload);
        $conversation = $threadId === null ? null : $this->conversationOf($inbox, $threadId);

        if ($conversation === null) {
            return false;
        }

        $groupMember = $this->groupMemberOf($conversation, RelayEventParser::typingGroupMemberId($relayPayload));
        $stamp = (string) now()->getPreciseTimestamp(3);
        Cache::put(self::stampKey($conversation, $groupMember), $stamp, now()->addMinutes(self::STAMP_TTL_MINUTES));

        $this->toggle($conversation, 'on', $groupMember);
        StopTypingJob::dispatch($conversation, $stamp, $groupMember)->delay(now()->addSeconds($this->offDelaySeconds()));

        return true;
    }

    public function offDelaySeconds(): int
    {
        return (int) config('zalo.typing_off_delay', self::DEFAULT_OFF_DELAY_SECONDS);
    }

    /** @param array{external_id: string, name: string, avatar: string|null}|null $groupMember */
    public static function stampKey(Conversation $conversation, ?array $groupMember = null): string
    {
        $memberSuffix = $groupMember === null ? '' : ":{$groupMember['external_id']}";

        return "zalo:typing-in:{$conversation->id}{$memberSuffix}";
    }

    /** @param array{external_id: string, name: string, avatar: string|null}|null $groupMember */
    public function toggle(Conversation $conversation, string $status, ?array $groupMember = null): void
    {
        // Người đang gõ là KHÁCH — cùng hình dạng payload widget gửi lên, nên FE
        // dashboard hiện bong bóng "đang nhập…" mà không cần biết đây là Zalo.
        (new TypingStatusManager($conversation, $conversation->contact, ['typing_status' => $status], $groupMember))
            ->toggleTypingStatus();
    }

    /**
     * Không tra được (danh bạ nhóm lỗi, người mới vào) thì rơi về hồ sơ của nhóm
     * như trước — vẫn báo có người gõ, chỉ thiếu tên.
     *
     * @return array{external_id: string, name: string, avatar: string|null}|null
     */
    private function groupMemberOf(Conversation $conversation, ?string $memberId): ?array
    {
        return $memberId === null ? null : $this->groupMembers->find($conversation, $memberId);
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
