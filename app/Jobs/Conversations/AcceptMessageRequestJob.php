<?php

namespace App\Jobs\Conversations;

use App\Jobs\ApplicationJob;
use App\Models\Conversation;
use App\Services\Channels\ChannelActionRegistry;

/**
 * Báo kênh ngoài rằng chủ hộp thư đã chấp nhận một hội thoại đang chờ. Lời gọi ra nền
 * tảng có thể chậm nên không chạy trong request; hỏng thì driver tự ghi log.
 */
class AcceptMessageRequestJob extends ApplicationJob
{
    public int $tries = 3;

    public int $timeout = 30;

    public function __construct(public readonly Conversation $conversation) {}

    public function handle(): void
    {
        ChannelActionRegistry::messageRequestsFor($this->conversation->inbox)?->accept($this->conversation);
    }
}
