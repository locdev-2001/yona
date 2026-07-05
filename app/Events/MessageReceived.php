<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Broadcast khi có tin nhắn mới (inbound hoặc outbound).
 *
 * Channel: private workspace.{workspace_id}.conversations
 * Auth: Broadcast::channel() trong routes/channels.php — membership check.
 *
 * Payload bao gồm message + conversation_id + last_message_at + unread_count
 * để UI cập nhật list + bubble không cần fetch lại.
 *
 * P05: $gapEvent (nếu có, từ SessionGapMaterializer) đi kèm ngay trong cùng
 * broadcast — FE chèn marker "có thể thiếu tin" vào đúng vị trí ngay lập tức,
 * không cần round-trip refetch riêng cho trường hợp realtime.
 *
 * Review H1: KHÔNG SerializesModels, KHÔNG query trong broadcastWith — payload
 * capture NGAY trong request context (RLS còn bind; conversation đã setRelation
 * fresh ở ingest). Queue worker prod chạy cho_rach_app không có
 * app.current_workspace → re-query lúc broadcast bị RLS chặn → job fail.
 * $message giữ lại CHỈ cho listener đồng bộ (LiftPhoneFromBusinessCard) —
 * không được dùng trong broadcastOn/broadcastWith.
 */
class MessageReceived implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;

    public readonly string $workspaceId;

    /** @var array<string, mixed> */
    public readonly array $broadcastPayload;

    /** @param  array<string, mixed>|null  $gapEvent */
    public function __construct(
        public readonly Message $message,
        public readonly ?array $gapEvent = null,
    ) {
        $conversation = $message->conversation;

        $this->workspaceId = $message->workspace_id;
        $this->broadcastPayload = [
            'message' => [
                'id' => $message->id,
                'conversation_id' => $message->conversation_id,
                'workspace_id' => $message->workspace_id,
                'direction' => $message->direction,
                'type' => $message->type,
                'body' => $message->body,
                'media_url' => $message->media_url,
                'media_meta' => $message->media_meta,
                'source_id' => $message->source_id,
                'platform_sent_at' => $message->platform_sent_at?->toIso8601String(),
                'sender_uid' => $message->sender_uid,
                'sender_name' => $message->sender_name,
                'sent_by' => $message->sent_by,
                'created_at' => $message->created_at->toIso8601String(),
            ],
            'conversation_id' => $message->conversation_id,
            'last_message_at' => $conversation?->last_message_at?->toIso8601String(),
            'unread_count' => $conversation ? $conversation->unread_count : 0,
            'stream_version' => $conversation?->stream_version,
            'gap_event' => $gapEvent === null ? null : [
                'id' => $gapEvent['id'],
                'kind' => $gapEvent['kind'],
                'gap_started_at' => $gapEvent['gap_started_at']->toIso8601String(),
                'gap_ended_at' => $gapEvent['gap_ended_at']->toIso8601String(),
                'stream_at' => $gapEvent['stream_at']->toIso8601String(),
                'stream_rank' => $gapEvent['stream_rank'],
            ],
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
