<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * P02 — typing indicator: phù du, broadcast-only, KHÔNG ghi DB (taxonomy loại 1).
 * ShouldBroadcastNow: presence trễ vài giây là vô nghĩa — không qua queue.
 * FE tự ẩn sau timeout (P03: 8s).
 */
class ConversationTyping implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public readonly string $workspaceId,
        public readonly string $conversationId,
        public readonly ?string $typistUid,
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
        return [
            'conversation_id' => $this->conversationId,
            'typist_uid' => $this->typistUid,
        ];
    }
}
