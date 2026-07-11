<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * P08 — dòng hệ thống mới (đổi tên nhóm, thành viên vào/ra, kết bạn).
 * Payload = stream item shape (FE append thẳng vào thread đang mở).
 */
class ConversationSystemLine implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;

    /** @param array<string, mixed> $item */
    public function __construct(
        public readonly string $workspaceId,
        public readonly array $item,
    ) {}

    /** @return array<Channel> */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("workspace.{$this->workspaceId}.conversations"),
        ];
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return ['item' => $this->item];
    }
}
