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
 * Broadcast khi có tin nhắn mới (inbound hoặc outbound).
 *
 * Channel: private workspace.{workspace_id}.conversations
 * Auth: Broadcast::channel() trong routes/channels.php — membership check.
 *
 * Payload bao gồm message + conversation_id + last_message_at + unread_count
 * để UI cập nhật list + bubble không cần fetch lại.
 */
class MessageReceived implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly Message $message) {}

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
        $conversation = $this->message->conversation;

        return [
            'message' => [
                'id' => $this->message->id,
                'conversation_id' => $this->message->conversation_id,
                'workspace_id' => $this->message->workspace_id,
                'direction' => $this->message->direction,
                'type' => $this->message->type,
                'body' => $this->message->body,
                'media_url' => $this->message->media_url,
                'media_meta' => $this->message->media_meta,
                'source_id' => $this->message->source_id,
                'platform_sent_at' => $this->message->platform_sent_at?->toIso8601String(),
                'sender_uid' => $this->message->sender_uid,
                'sender_name' => $this->message->sender_name,
                'sent_by' => $this->message->sent_by,
                'created_at' => $this->message->created_at->toIso8601String(),
            ],
            'conversation_id' => $this->message->conversation_id,
            'last_message_at' => $conversation?->last_message_at?->toIso8601String(),
            'unread_count' => $conversation ? $conversation->unread_count : 0,
        ];
    }
}
