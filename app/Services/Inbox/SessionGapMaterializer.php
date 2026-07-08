<?php

namespace App\Services\Inbox;

use App\Models\Conversation;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * P05 (inbox-multichannel-relayer) — chèn dấu ngăn 'session_gap' TRƯỚC khi
 * message post-gap "visible" (chokepoint duy nhất: InboundMessageService::ingest,
 * gọi TRƯỚC upsertMessage). Đóng blocker #1 (event chèn muộn mất marker).
 *
 * Cửa sổ gap là ACCOUNT-level (channel_accounts.gap_started_at, set bởi
 * webhook handleBridgeSession khi session_lost); marker là CONVERSATION-level
 * (mỗi hội thoại tự chèn marker riêng khi nhận tin post-gap ĐẦU TIÊN của nó).
 *
 * KHÔNG check gap_open: account có thể đã reconnect (gap_open=false, P04)
 * TRƯỚC KHI hội thoại này kịp nhận tin đầu tiên post-gap — chỉ so
 * platform_sent_at với gap_started_at (giữ nguyên dù gap_open đã tắt).
 * Idempotent qua unique(conversation_id, kind, gap_started_at) — gọi lại an toàn.
 */
class SessionGapMaterializer
{
    private const KIND = 'session_gap';

    private const STREAM_RANK = 5;

    /**
     * @return array<string, mixed>|null dữ liệu marker vừa tạo (null nếu không tạo — đã
     *                                   có marker này hoặc không có gap post-này để chèn)
     */
    public function materializeIfNeeded(Conversation $conversation, ?string $platformSentAt): ?array
    {
        if ($conversation->channel_account_id === null || $platformSentAt === null) {
            return null;
        }

        $gapStartedAt = DB::table('channel_accounts')
            ->where('id', $conversation->channel_account_id)
            ->value('gap_started_at');

        if ($gapStartedAt === null) {
            return null;
        }

        $gapStartedAt = Carbon::parse($gapStartedAt);

        if (! Carbon::parse($platformSentAt)->gt($gapStartedAt)) {
            return null;
        }

        $event = [
            'id' => (string) Str::uuid(),
            'workspace_id' => $conversation->workspace_id,
            'conversation_id' => $conversation->id,
            'kind' => self::KIND,
            'gap_started_at' => $gapStartedAt,
            'gap_ended_at' => now(),
            'stream_at' => $gapStartedAt,
            'stream_rank' => self::STREAM_RANK,
            'created_at' => now(),
        ];

        $inserted = DB::table('conversation_events')->insertOrIgnore($event);

        if ($inserted === 0) {
            return null;
        }

        Conversation::where('id', $conversation->id)->increment('stream_version');

        return $event;
    }
}
