<?php

namespace App\Jobs\Conversations;

use App\Jobs\ApplicationJob;
use App\Models\Conversation;
use App\Services\Channels\ChannelActionRegistry;

/**
 * Báo "đang soạn tin" ra kênh ngoài. Lời gọi ra kênh có thể mất vài giây (bridge
 * chờ nền tảng) — chạy trong request thì mỗi lượt gõ của agent giữ một worker web
 * tới lúc đó. Hỏng thì bỏ: gõ tiếp là có lượt mới, gửi trễ còn sai hơn không gửi.
 */
class RelayTypingJob extends ApplicationJob
{
    public int $tries = 1;

    public int $timeout = 30;

    public function __construct(public readonly Conversation $conversation)
    {
        $this->onQueue('critical');
    }

    public function handle(): void
    {
        ChannelActionRegistry::for($this->conversation->inbox)?->typing($this->conversation);
    }
}
