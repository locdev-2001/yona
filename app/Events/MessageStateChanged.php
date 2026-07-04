<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * P02 — broadcast khi trạng thái tin đổi: recalled | delivered | seen | reaction.
 * Channel dùng chung với MessageReceived (workspace.{id}.conversations).
 * FE patch tin tại chỗ theo message_id — không refetch.
 */
class MessageStateChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Message $message,
        public readonly string $state,
    ) {}

    /** @return array<Channel> */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("workspace.{$this->message->workspace_id}.conversations"),
        ];
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return [
            'conversation_id' => $this->message->conversation_id,
            'message_id' => $this->message->id,
            'state' => $this->state,
            'recalled_at' => $this->message->recalled_at?->toIso8601String(),
            'delivered_at' => $this->message->delivered_at?->toIso8601String(),
            'seen_at' => $this->message->seen_at?->toIso8601String(),
            'reactions' => $this->message->reactions()
                ->get(['reactor_uid', 'icon', 'reacted_at'])
                ->map(fn ($r) => [
                    'reactor_uid' => $r->reactor_uid,
                    'icon' => $r->icon,
                    'reacted_at' => $r->reacted_at->toIso8601String(),
                ]),
        ];
    }
}
