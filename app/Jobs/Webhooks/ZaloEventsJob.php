<?php

namespace App\Jobs\Webhooks;

use App\Jobs\ApplicationJob;
use App\Services\Zalo\BridgeEventService;
use App\Services\Zalo\Exception\EchoAwaitingSourceIdException;
use App\Services\Zalo\IncomingMessageService;
use Illuminate\Queue\Jobs\SyncJob;

// Cùng khuôn với các job webhook kênh ngoài F2–F5: controller chỉ nhận và đẩy
// vào hàng đợi, xử lý nằm ở service.
class ZaloEventsJob extends ApplicationJob
{
    /** Nhịp nhường cho chiều ra ghi xong msgId của phần vừa gửi. */
    public const ECHO_RETRY_DELAY_SECONDS = 3;

    /** Số lượt hoãn tối đa; hết lượt thì tin dội lại được dựng như tin thật. */
    public const ECHO_MAX_RETRIES = 2;

    /** Lượt chạy đầu + số lượt hoãn — worker mặc định chỉ cho 1 lượt. */
    public int $tries = self::ECHO_MAX_RETRIES + 1;

    /** @param array<string, mixed> $params */
    public function __construct(public readonly array $params) {}

    public function handle(BridgeEventService $events): void
    {
        try {
            $events->handle($this->params);
        } catch (EchoAwaitingSourceIdException) {
            $this->retryOrForceEcho($events);
        }
    }

    /**
     * Hết lượt hoãn thì xử lý ngay với cờ "đã chờ đủ" — echo thật từ điện thoại
     * của chủ shop không bao giờ được phép bị nuốt.
     */
    private function retryOrForceEcho(BridgeEventService $events): void
    {
        if ($this->canDeferAgain()) {
            $this->release(self::ECHO_RETRY_DELAY_SECONDS);

            return;
        }

        $events->handle([...$this->params, IncomingMessageService::ECHO_WAIT_EXHAUSTED => true]);
    }

    /**
     * Chỉ hàng đợi THẬT mới có "lượt sau": lane đồng bộ (`sync`) và lời gọi
     * `handle()` trực tiếp không bao giờ chạy lại job đã release, hoãn ở đó là
     * đánh rơi sự kiện.
     */
    private function canDeferAgain(): bool
    {
        return $this->job !== null
            && ! $this->job instanceof SyncJob
            && $this->attempts() <= self::ECHO_MAX_RETRIES;
    }
}
