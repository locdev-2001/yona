<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * P02 — broadcast khi trạng thái tin đổi: recalled | delivered | seen | reaction.
 * Channel dùng chung với MessageReceived (workspace.{id}.conversations).
 * FE patch tin tại chỗ theo message_id — không refetch.
 *
 * Review H1: KHÔNG SerializesModels, KHÔNG query trong broadcastOn/broadcastWith —
 * payload capture NGAY trong request context (RLS còn bind). Queue worker prod
 * chạy cho_rach_app KHÔNG có app.current_workspace → mọi query lúc broadcast bị
 * RLS chặn → job fail im lặng (pattern đúng: ConversationSystemLine).
 */
class MessageStateChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;

    public readonly string $workspaceId;

    /** @var array<string, mixed> */
    public readonly array $broadcastPayload;

    public function __construct(Message $message, public readonly string $state)
    {
        $this->workspaceId = $message->workspace_id;
        $this->broadcastPayload = [
            'conversation_id' => $message->conversation_id,
            'message_id' => $message->id,
            'state' => $state,
            'recalled_at' => $message->recalled_at?->toIso8601String(),
            'delivered_at' => $message->delivered_at?->toIso8601String(),
            'seen_at' => $message->seen_at?->toIso8601String(),
            'reactions' => $message->reactions()
                ->get(['reactor_uid', 'icon', 'reacted_at'])
                ->map(fn ($r) => [
                    'reactor_uid' => $r->reactor_uid,
                    'icon' => $r->icon,
                    'reacted_at' => $r->reacted_at->toIso8601String(),
                ])
                ->all(),
        ];
    }

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
        return $this->broadcastPayload;
    }
}
