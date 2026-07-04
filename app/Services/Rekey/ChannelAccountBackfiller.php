<?php

namespace App\Services\Rekey;

use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * P02 (inbox-multichannel-relayer) — backfill re-key conversations sang
 * channel_account_id. Idempotent (mọi bước lọc `IS NULL`/`NOT EXISTS`,
 * resumable). Chạy qua pgsql_privileged (CLI không có RLS) — mọi query
 * đều tường minh workspace_id/scope qua join, không cross-tenant.
 *
 * Thứ tự bắt buộc, gọi từ RekeyConversationsToChannelAccount:
 *   (a) createChannelAccounts    (b) attachConnectionsToAccounts
 *   (c) backfillConversationAccountId
 *   (d) DuplicateConversationMerger (class riêng)
 *   (e) backfillAliases
 */
class ChannelAccountBackfiller
{
    private ConnectionInterface $db;

    public function __construct()
    {
        $this->db = DB::connection('pgsql_privileged');
    }

    /** (a) Tạo channel_accounts từ distinct (workspace_id, personal_uid) của zalo_connections. Bỏ qua null-uid. */
    public function createChannelAccounts(): int
    {
        $groups = $this->db->table('zalo_connections')
            ->select('workspace_id', 'personal_uid')
            ->whereNotNull('personal_uid')
            ->distinct()
            ->get();

        $created = 0;

        foreach ($groups as $group) {
            $exists = $this->db->table('channel_accounts')
                ->where('workspace_id', $group->workspace_id)
                ->where('channel', 'zalo_personal')
                ->where('account_uid', $group->personal_uid)
                ->exists();

            if ($exists) {
                continue;
            }

            $latestSlot = $this->db->table('zalo_connections')
                ->where('workspace_id', $group->workspace_id)
                ->where('personal_uid', $group->personal_uid)
                ->orderByDesc('updated_at')
                ->first(['display_name', 'avatar_url']);

            $hasConnectedSlot = $this->db->table('zalo_connections')
                ->where('workspace_id', $group->workspace_id)
                ->where('personal_uid', $group->personal_uid)
                ->where('state', 'connected')
                ->whereNull('deleted_at')
                ->exists();

            $this->db->table('channel_accounts')->insert([
                'id' => (string) Str::uuid(),
                'workspace_id' => $group->workspace_id,
                'channel' => 'zalo_personal',
                'account_uid' => $group->personal_uid,
                'display_name' => $latestSlot?->display_name,
                'avatar_url' => $latestSlot?->avatar_url,
                'status' => $hasConnectedSlot ? 'connected' : 'needs_qr',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $created++;
        }

        return $created;
    }

    /** (b) Gắn zalo_connections.channel_account_id theo personal_uid (kể cả slot soft-delete — danh tính giữ nguyên). */
    public function attachConnectionsToAccounts(): int
    {
        $rows = $this->db->table('zalo_connections')
            ->whereNull('channel_account_id')
            ->whereNotNull('personal_uid')
            ->get(['id', 'workspace_id', 'personal_uid']);

        $updated = 0;

        foreach ($rows as $row) {
            $accountId = $this->db->table('channel_accounts')
                ->where('workspace_id', $row->workspace_id)
                ->where('channel', 'zalo_personal')
                ->where('account_uid', $row->personal_uid)
                ->value('id');

            if ($accountId === null) {
                continue;
            }

            $this->db->table('zalo_connections')->where('id', $row->id)->update([
                'channel_account_id' => $accountId,
                'updated_at' => now(),
            ]);

            $updated++;
        }

        return $updated;
    }

    /**
     * (c) Backfill conversations.channel_account_id qua join slot (zalo_connection_id) → account.
     * P02(g) swap đã drop cột này — no-op an toàn nếu lỡ gọi lại sau swap (không còn gì để backfill).
     */
    public function backfillConversationAccountId(): int
    {
        if (! Schema::hasColumn('conversations', 'zalo_connection_id')) {
            return 0;
        }

        $rows = $this->db->table('conversations as c')
            ->join('zalo_connections as zc', 'zc.connection_id', '=', 'c.zalo_connection_id')
            ->whereNull('c.channel_account_id')
            ->whereNotNull('zc.channel_account_id')
            ->get(['c.id as conv_id', 'zc.channel_account_id']);

        foreach ($rows as $row) {
            $this->db->table('conversations')->where('id', $row->conv_id)->update([
                'channel_account_id' => $row->channel_account_id,
                'updated_at' => now(),
            ]);
        }

        return $rows->count();
    }

    /** (e) Backfill message_source_aliases từ messages.source_id có sẵn (kind=legacy), idempotent. */
    public function backfillAliases(): int
    {
        return DB::connection('pgsql_privileged')->affectingStatement(
            "INSERT INTO message_source_aliases (id, workspace_id, conversation_id, message_id, source_id, kind, created_at)
             SELECT gen_random_uuid(), m.workspace_id, m.conversation_id, m.id, m.source_id, 'legacy', now()
             FROM messages m
             WHERE m.source_id IS NOT NULL
               AND NOT EXISTS (
                 SELECT 1 FROM message_source_aliases a
                 WHERE a.conversation_id = m.conversation_id AND a.source_id = m.source_id
               )
             ON CONFLICT (conversation_id, source_id) DO NOTHING"
        );
    }
}
