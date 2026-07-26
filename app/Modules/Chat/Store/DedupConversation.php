<?php

namespace App\Modules\Chat\Store;

use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Facades\DB;

/**
 * P02(d) (inbox-multichannel-relayer) — gộp nhóm (channel_account_id, sender_uid)
 * có >1 conversation active về 1 canonical. Ưu tiên conv đã có lead_id (remap
 * lead trước soft-delete), fallback conv có tin nhắn sớm nhất.
 *
 * Dùng bởi:
 *  - RekeyConversationsToChannelAccount --backfill (P02, one-time)
 *  - PromoteAccountBinder (P04, ongoing) — dọn nhóm trùng nếu inbound lỡ đến
 *    slot mới TRƯỚC khi bind hoàn tất (race hẹp, slot chưa có channel_account_id).
 *
 * Tự chứa (không phụ thuộc ZaloConversationMerger — class đó xoá ở P08, class
 * này thì không, vẫn cần cho runtime).
 *
 * Caller (RekeyConversationsToChannelAccount) PHẢI loại nhóm both_have_lead
 * (LeadConflictPreflight) trước khi gọi mergeGroup() — class này không tự
 * phát hiện conflict, chỉ gộp.
 *
 * Connection mặc định 'pgsql_privileged' (an toàn cho CLI, không có RLS context —
 * đổi sang connection khác sẽ khiến RLS lọc về rỗng, silent no-op). Caller có
 * transaction riêng đang mở trên connection khác (vd PromoteAccountBinder, web
 * request đã bind RLS) PHẢI gọi on(null) để cùng session — khác session không
 * thấy được thay đổi còn uncommitted trong transaction bao ngoài.
 */
class DedupConversation
{
    private ConnectionInterface $db;

    public function __construct(?string $connection = 'pgsql_privileged')
    {
        $this->db = DB::connection($connection);
    }

    public function on(?string $connection): self
    {
        return new self($connection);
    }

    /** Nhóm (channel_account_id, sender_uid) có >1 conversation active. */
    public function duplicateGroups(): array
    {
        return $this->db->table('conversations')
            ->select('workspace_id', 'channel_account_id', 'sender_uid', DB::raw('COUNT(*) as conv_count'))
            ->whereNotNull('channel_account_id')
            ->whereNull('deleted_at')
            ->groupBy('workspace_id', 'channel_account_id', 'sender_uid')
            ->havingRaw('COUNT(*) > 1')
            ->get()
            ->all();
    }

    public function mergeGroup(string $channelAccountId, string $senderUid): void
    {
        $convs = $this->db->table('conversations')
            ->where('channel_account_id', $channelAccountId)
            ->where('sender_uid', $senderUid)
            ->whereNull('deleted_at')
            ->get(['id', 'lead_id', 'created_at']);

        if ($convs->count() < 2) {
            return;
        }

        $canonical = $convs->first(fn ($c) => $c->lead_id !== null)
            ?? $convs->sortBy(fn ($c) => $this->firstMessageAt($c->id) ?? $c->created_at)->first();

        foreach ($convs as $conv) {
            if ($conv->id === $canonical->id) {
                continue;
            }

            if ($conv->lead_id !== null && $canonical->lead_id === null) {
                $this->remapLead($conv->lead_id, (string) $canonical->id, (string) $conv->id);
                $canonical->lead_id = $conv->lead_id;
            }

            $this->mergeConversationMessages((string) $conv->id, (string) $canonical->id);
        }
    }

    /**
     * Di chuyển message từ $sourceId sang $targetId (né unique conversation_id+source_id
     * — message trùng source_id ở đích thì bỏ lại, không move), rồi soft-delete nguồn.
     */
    private function mergeConversationMessages(string $sourceId, string $targetId): void
    {
        if ($sourceId === $targetId) {
            return;
        }

        $this->db->transaction(function () use ($sourceId, $targetId) {
            $existingSourceIds = $this->db->table('messages')
                ->where('conversation_id', $targetId)
                ->whereNotNull('source_id')
                ->pluck('source_id')
                ->all();

            $moveQuery = $this->db->table('messages')->where('conversation_id', $sourceId);

            if ($existingSourceIds !== []) {
                $moveQuery->where(function ($q) use ($existingSourceIds) {
                    $q->whereNull('source_id')->orWhereNotIn('source_id', $existingSourceIds);
                });
            }

            $moveQuery->update(['conversation_id' => $targetId, 'updated_at' => now()]);

            $this->recomputeCache($targetId);

            $this->db->table('conversations')->where('id', $sourceId)->update(['deleted_at' => now(), 'updated_at' => now()]);
        });
    }

    private function recomputeCache(string $conversationId): void
    {
        $latest = $this->db->table('messages')
            ->where('conversation_id', $conversationId)
            ->orderByRaw('COALESCE(platform_sent_at, created_at) DESC')
            ->first(['body', 'platform_sent_at', 'created_at']);

        if ($latest === null) {
            return;
        }

        $unread = $this->db->table('messages')
            ->where('conversation_id', $conversationId)
            ->where('direction', 'in')
            ->count();

        $this->db->table('conversations')
            ->where('id', $conversationId)
            ->update([
                'last_message_at' => $latest->platform_sent_at ?? $latest->created_at,
                'last_message_preview' => mb_substr((string) ($latest->body ?? ''), 0, 100),
                'unread_count' => $unread,
                'updated_at' => now(),
            ]);
    }

    private function firstMessageAt(string $conversationId): ?string
    {
        return $this->db->table('messages')
            ->where('conversation_id', $conversationId)
            ->min('platform_sent_at');
    }

    private function remapLead(string $leadId, string $toConvId, string $fromConvId): void
    {
        $this->db->table('leads')->where('id', $leadId)->update(['conversation_id' => $toConvId, 'updated_at' => now()]);
        $this->db->table('conversations')->where('id', $toConvId)->update(['lead_id' => $leadId, 'updated_at' => now()]);
        $this->db->table('conversations')->where('id', $fromConvId)->update(['lead_id' => null, 'updated_at' => now()]);
    }
}
