<?php

namespace App\Services\Rekey;

use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * P02(f) (inbox-multichannel-relayer) — phát hiện + ghi nhận nhóm
 * both_have_lead: (channel_account_id, peer_uid) có ≥2 conversation active
 * MANG lead_id KHÁC NHAU. Nhóm này bị DedupConversation bỏ qua
 * (không tự merge) — chặn swap unique P02(g) cho tới khi resolve tay.
 */
class LeadConflictPreflight
{
    private ConnectionInterface $db;

    public function __construct()
    {
        $this->db = DB::connection('pgsql_privileged');
    }

    /**
     * @return list<array{workspace_id: string, channel_account_id: string, peer_uid: string, source_conversation_id: string, source_lead_id: string, target_conversation_id: string, target_lead_id: string}>
     */
    public function detect(): array
    {
        $groups = $this->db->select('
            SELECT workspace_id, channel_account_id, peer_uid
            FROM conversations
            WHERE channel_account_id IS NOT NULL AND deleted_at IS NULL
            GROUP BY workspace_id, channel_account_id, peer_uid
            HAVING COUNT(*) > 1 AND COUNT(DISTINCT lead_id) FILTER (WHERE lead_id IS NOT NULL) > 1
        ');

        $conflicts = [];

        foreach ($groups as $group) {
            $leadConvs = $this->db->table('conversations')
                ->where('channel_account_id', $group->channel_account_id)
                ->where('peer_uid', $group->peer_uid)
                ->whereNull('deleted_at')
                ->whereNotNull('lead_id')
                ->orderBy('created_at')
                ->get(['id', 'lead_id']);

            $conflicts[] = [
                'workspace_id' => $group->workspace_id,
                'channel_account_id' => $group->channel_account_id,
                'peer_uid' => $group->peer_uid,
                'source_conversation_id' => (string) $leadConvs[0]->id,
                'source_lead_id' => (string) $leadConvs[0]->lead_id,
                'target_conversation_id' => (string) $leadConvs[1]->id,
                'target_lead_id' => (string) $leadConvs[1]->lead_id,
            ];
        }

        return $conflicts;
    }

    /** Ghi conflict vào lead_merge_conflicts (idempotent: bỏ qua cặp đã ghi chưa resolve). */
    public function record(array $conflicts): int
    {
        $written = 0;

        foreach ($conflicts as $conflict) {
            $exists = $this->db->table('lead_merge_conflicts')
                ->where('channel_account_id', $conflict['channel_account_id'])
                ->where('peer_uid', $conflict['peer_uid'])
                ->whereNull('resolved_at')
                ->exists();

            if ($exists) {
                continue;
            }

            $this->db->table('lead_merge_conflicts')->insert([
                'id' => (string) Str::uuid(),
                'workspace_id' => $conflict['workspace_id'],
                'channel_account_id' => $conflict['channel_account_id'],
                'peer_uid' => $conflict['peer_uid'],
                'source_conversation_id' => $conflict['source_conversation_id'],
                'target_conversation_id' => $conflict['target_conversation_id'],
                'source_lead_id' => $conflict['source_lead_id'],
                'target_lead_id' => $conflict['target_lead_id'],
                'detected_at' => now(),
            ]);

            $written++;
        }

        return $written;
    }
}
