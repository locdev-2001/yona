<?php

namespace App\Events;

use App\Models\Message;
use App\Services\Inbox\MessageItemSerializer;
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
 * fresh ở ingest). Queue worker prod chạy yona_app không có
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
            // Shape = stream item (MessageItemSerializer) — FE append thẳng, không map lại.
            // reactions luôn [] ở đây (không query — Review H1); tin replay đã có id
            // trong thread → FE dedup theo id bỏ qua, không ghi đè reactions thật.
            'message' => MessageItemSerializer::fromModel($message),
            'conversation_id' => $message->conversation_id,
            // Hồ sơ người gửi (nhóm) — FE merge vào participants map của conversation
            // đang mở, tránh initials fallback khi thành viên mới nhắn lần đầu realtime.
            'sender_participant' => $message->sender_uid !== null
                ? (($conversation?->participants ?? [])[$message->sender_uid] ?? null)
                : null,
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
