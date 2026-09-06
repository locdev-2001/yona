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
    public function __construct(
        public readonly Conversation $conversation,
        public readonly string $stamp,
    ) {
        $this->onQueue('critical');
    }

    public function handle(TypingRelayService $typing): void
    {
        // Khách gõ tiếp sau khi job này được hẹn ⇒ đã có dấu mới hơn, để lượt sau tắt.
        if (Cache::get(TypingRelayService::stampKey($this->conversation)) !== $this->stamp) {
            return;
        }

        Cache::forget(TypingRelayService::stampKey($this->conversation));
        $typing->toggle($this->conversation, 'off');
    }
}
