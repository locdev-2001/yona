<?php

namespace App\Modules\Chat\Delivery;

use App\Models\ChannelAccount;
use App\Models\Conversation;
use App\Models\Message;
use App\Modules\Chat\Port\Capability\SupportsReactions;
use App\Modules\Chat\Port\Capability\SupportsStickers;
use App\Modules\Chat\Port\ChannelDriver;
use App\Modules\Chat\Port\Exception\UnsupportedCapabilityException;
use App\Services\Inbox\MessageStateService;
use Illuminate\Support\Facades\RateLimiter;
use InvalidArgumentException;
use RuntimeException;

/**
 * Đường đi duy nhất cho các tương tác lên tin (cảm xúc, sticker).
 *
 * Hai tầng chặn tần suất, KHÔNG thay thế nhau:
 *   - tầng này chặn theo NGƯỜI DÙNG / workspace — chống thao tác dồn dập từ UI
 *   - driver chặn theo PHIÊN nền tảng — chống vượt ngưỡng của nhà cung cấp
 * Bỏ tầng nào cũng hở: một người bấm liên tục và mười người cùng bấm là hai
 * kịch bản khác nhau.
 *
 * Nhận `actorId` thay vì gọi auth(): module nghiệp vụ không được biết tới ngữ
 * cảnh request, để cùng lõi này dùng lại được cho API và tác vụ nền.
 */
class InteractionPipeline
{
    private const REACTION_MAX_PER_MINUTE = 30;

    private const STICKER_SEARCH_MAX_PER_MINUTE = 10;

    public function __construct(private readonly MessageStateService $stateService) {}

    /**
     * @throws UnsupportedCapabilityException kênh không có diện cảm xúc
     * @throws InvalidArgumentException tin thiếu định danh nền tảng
     * @throws RuntimeException vượt ngưỡng hoặc nền tảng từ chối
     */
    public function react(
        ChannelDriver $driver,
        Conversation $conversation,
        Message $message,
        string $icon,
        int $actorId,
    ): void {
        if (! $driver instanceof SupportsReactions) {
            throw new UnsupportedCapabilityException('reaction', $conversation->channel);
        }

        // Không có source_id thì applyReactions không tìm ra dòng để ghi —
        // báo lỗi tường minh còn hơn trả ok mà không có gì xảy ra.
        if (empty($message->source_id)) {
            throw new InvalidArgumentException('reaction_unavailable');
        }

        $this->throttle('reaction:'.$conversation->workspace_id.':'.$actorId, self::REACTION_MAX_PER_MINUTE);

        $driver->react($conversation, $message, $icon);

        // Chỉ ghi SAU khi nền tảng nhận: ghi trước rồi nền tảng từ chối là lệch
        // hai chiều vĩnh viễn, không có gì tự chữa lại được.
        $reactorUid = ChannelAccount::where('id', $conversation->channel_account_id)->value('account_uid') ?? 'self';
        $this->stateService->applyReactions($conversation->channel_account_id, [[
            'target_msg_id' => (string) $message->source_id,
            'reactor_uid' => (string) $reactorUid,
            'icon' => $icon,
            'reacted_at' => now(),
        ]]);
    }

    /**
     * @return list<array<string, mixed>>
     *
     * @throws UnsupportedCapabilityException|RuntimeException
     */
    public function searchStickers(ChannelDriver $driver, Conversation $conversation, string $keyword, int $actorId): array
    {
        if (! $driver instanceof SupportsStickers) {
            throw new UnsupportedCapabilityException('sticker', $conversation->channel);
        }

        $this->throttle('sticker-search:'.$actorId, self::STICKER_SEARCH_MAX_PER_MINUTE);

        return $driver->searchStickers($conversation, $keyword);
    }

    /** @throws RuntimeException */
    private function throttle(string $key, int $maxPerMinute): void
    {
        if (! RateLimiter::attempt($key, $maxPerMinute, fn () => true, 60)) {
            throw new RuntimeException('rate_limited');
        }
    }
}
