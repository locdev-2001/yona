<?php

namespace App\Services\Inbox;

use App\Events\ConversationSystemLine;
use App\Models\Conversation;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * P08 — dòng hệ thống trong thread (channel-agnostic): nhận DTO trung tính
 * đã parse (driver/webhook parse shape platform), ghi conversation_events.
 *
 * Idempotent: dedup_key (source_id envelope) unique partial → insertOrIgnore,
 * bridge retry không nhân đôi dòng. KHÔNG meter, KHÔNG đụng unread/preview.
 */
class SocialEventMaterializer
{
    private const SYSTEM_LINE_RANK = 3; // giữa message (0) và gap marker (5)

    /**
     * @param  array<string, mixed>  $payload  {act, label, ...} — label đã build sẵn tiếng Việt
     */
    public function materialize(
        Conversation $conversation,
        string $kind,
        string $dedupKey,
        array $payload,
        ?Carbon $occurredAt = null,
    ): bool {
        $at = $occurredAt ?? now();
        $id = (string) Str::uuid();

        $inserted = DB::table('conversation_events')->insertOrIgnore([
            'id' => $id,
            'workspace_id' => $conversation->workspace_id,
            'conversation_id' => $conversation->id,
            'kind' => $kind,
            'gap_started_at' => $at, // NOT NULL legacy — dùng làm mốc thời gian event
            'gap_ended_at' => null,
            'stream_at' => $at,
            'stream_rank' => self::SYSTEM_LINE_RANK,
            'payload' => json_encode($payload),
            'dedup_key' => mb_substr($dedupKey, 0, 80),
            'created_at' => now(),
        ]);

        if ($inserted === 0) {
            return false; // retry/replay — đã có dòng
        }

        Conversation::where('id', $conversation->id)->increment('stream_version');

        event(new ConversationSystemLine($conversation->workspace_id, [
            'item_type' => 'event',
            'id' => $id,
            'kind' => $kind,
            'conversation_id' => $conversation->id,
            'payload' => $payload,
            'gap_started_at' => $at->toIso8601String(),
            'gap_ended_at' => null,
            'stream_at' => $at->toIso8601String(),
        ]));

        return true;
    }
}
