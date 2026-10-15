<?php

namespace App\Jobs\Zalo;

use App\Jobs\ApplicationJob;
use App\Models\Conversation;
use App\Services\Zalo\TypingRelayService;
use Illuminate\Support\Facades\Cache;

/**
 * Tắt "đang nhập…" khi Zalo im vài giây. Zalo không có sự kiện thôi gõ, còn FE chỉ
 * tự tắt sau 30s — không có job này thì bong bóng đứng lại rất lâu sau khi khách
 * gõ xong. Cùng hàng đợi `critical` với ActionCableBroadcastJob: trễ ở đây là
 * người dùng nhìn thấy ngay.
 */
class StopTypingJob extends ApplicationJob
{
    /** @param array{external_id: string, name: string, avatar: string|null}|null $groupMember */
    public function __construct(
        public readonly Conversation $conversation,
        public readonly string $stamp,
        public readonly ?array $groupMember = null,
    ) {
        $this->onQueue('critical');
    }

    public function handle(TypingRelayService $typing): void
    {
        // Khách gõ tiếp sau khi job này được hẹn ⇒ đã có dấu mới hơn, để lượt sau tắt.
        $stampKey = TypingRelayService::stampKey($this->conversation, $this->groupMember);

        if (Cache::get($stampKey) !== $this->stamp) {
            return;
        }

        Cache::forget($stampKey);
        $typing->toggle($this->conversation, 'off', $this->groupMember);
    }
}
