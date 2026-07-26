<?php

namespace App\Console\Commands;

use App\Modules\Chat\Store\DedupConversation;
use App\Services\Rekey\ChannelAccountBackfiller;
use App\Services\Rekey\LeadConflictPreflight;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * P02 (inbox-multichannel-relayer) — orchestrator re-key conversations
 * từ (zalo_connection_id, sender_uid) sang (channel_account_id, sender_uid).
 *
 * --dry-run  : read-only, xuất report đối chiếu spike (không ghi DB).
 * --backfill : chạy (a)→(f). Idempotent — chạy lại an toàn (resumable).
 * --swap     : bước (g) HOÃN — chỉ mở khi P03 (outbound) + P06 (alias) live
 *              (chạy qua `php artisan migrate`, KHÔNG qua command này).
 */
class RekeyConversationsToChannelAccount extends Command
{
    protected $signature = 'inbox:rekey-channel-account
        {--dry-run : Chỉ đọc, in report, không ghi DB}
        {--backfill : Chạy bước (a)-(f): tạo account, gộp trùng, backfill alias, preflight lead conflict}';

    protected $description = 'P02 — Re-key conversations sang channel_account_id (dry-run/backfill). Bước (g) swap chạy qua migration riêng, gated sau P03+P06.';

    public function handle(
        ChannelAccountBackfiller $backfiller,
        DedupConversation $merger,
        LeadConflictPreflight $preflight,
    ): int {
        if ($this->option('dry-run')) {
            return $this->runDryRun();
        }

        if ($this->option('backfill')) {
            return $this->runBackfill($backfiller, $merger, $preflight);
        }

        $this->error('Chọn 1 flag: --dry-run hoặc --backfill.');

        return self::FAILURE;
    }

    private function runDryRun(): int
    {
        // P02(g) đã swap (drop zalo_connection_id) — dry-run này chỉ có ý nghĩa TRƯỚC swap.
        if (! Schema::hasColumn('conversations', 'zalo_connection_id')) {
            $this->info('P02(g) đã swap — conversations.zalo_connection_id không còn tồn tại. Không còn gì để dry-run.');

            return self::SUCCESS;
        }

        $db = DB::connection('pgsql_privileged');

        $forkGroups = $db->select('
            SELECT c.workspace_id, zc.personal_uid, c.sender_uid, COUNT(*) AS conv_count
            FROM conversations c
            JOIN zalo_connections zc ON zc.connection_id = c.zalo_connection_id
            WHERE c.deleted_at IS NULL
            GROUP BY c.workspace_id, zc.personal_uid, c.sender_uid
            HAVING COUNT(*) > 1
        ');
        $convsInForkGroups = array_sum(array_map(fn ($g) => (int) $g->conv_count, $forkGroups));

        $leadStats = $db->selectOne('
            SELECT
              COUNT(*) FILTER (WHERE lead_kinds > 1) AS both_have_lead,
              COUNT(*) FILTER (WHERE lead_kinds = 1) AS one_lead,
              COUNT(*) FILTER (WHERE lead_kinds = 0) AS no_lead
            FROM (
              SELECT c.workspace_id, zc.personal_uid, c.sender_uid,
                     COUNT(DISTINCT c.lead_id) FILTER (WHERE c.lead_id IS NOT NULL) AS lead_kinds
              FROM conversations c
              JOIN zalo_connections zc ON zc.connection_id = c.zalo_connection_id
              WHERE c.deleted_at IS NULL
              GROUP BY c.workspace_id, zc.personal_uid, c.sender_uid
              HAVING COUNT(*) > 1
            ) grouped
        ');

        $dupSourceId = $db->selectOne('
            SELECT COUNT(*) AS cnt FROM (
              SELECT m.source_id
              FROM messages m
              JOIN conversations c ON c.id = m.conversation_id
              JOIN zalo_connections zc ON zc.connection_id = c.zalo_connection_id
              WHERE c.deleted_at IS NULL AND m.source_id IS NOT NULL
              GROUP BY zc.personal_uid, m.source_id
              HAVING COUNT(DISTINCT m.conversation_id) > 1
            ) dup
        ');

        $aliasCoverage = $db->selectOne('SELECT COUNT(*) FILTER (WHERE source_id IS NOT NULL) AS total, COUNT(*) FILTER (WHERE source_id IS NULL) AS null_count FROM messages');

        $nullUidSlots = $db->selectOne('SELECT COUNT(*) AS cnt FROM zalo_connections WHERE personal_uid IS NULL');

        $this->line('=== Dry-run rekey: channel_account_id ===');
        $this->line('Fork groups: '.count($forkGroups)." (gộp {$convsInForkGroups} → ".count($forkGroups).' conversation)');
        $this->line("Lead conflict — both_have_lead: {$leadStats->both_have_lead} · one_lead: {$leadStats->one_lead} · no_lead: {$leadStats->no_lead}");
        $this->line("Dup source_id across conversation cùng account: {$dupSourceId->cnt}");
        $this->line("Alias coverage khả thi: {$aliasCoverage->total} message có source_id, {$aliasCoverage->null_count} null");
        $this->line("Slot null-uid (bỏ qua): {$nullUidSlots->cnt}");

        if ((int) $leadStats->both_have_lead > 0) {
            $this->warn("{$leadStats->both_have_lead} nhóm both_have_lead — sẽ bị SKIP khi merge, cần resolve tay trước khi swap (g).");
        }

        $csvPath = base_path('plans/reports/rekey-dryrun-'.now()->format('Y-m-d').'.csv');
        $fh = fopen($csvPath, 'w');
        fputcsv($fh, ['workspace_id', 'personal_uid', 'sender_uid', 'conv_count']);
        foreach ($forkGroups as $group) {
            fputcsv($fh, [$group->workspace_id, $group->personal_uid, $group->sender_uid, $group->conv_count]);
        }
        fclose($fh);
        $this->info("Report: {$csvPath}");

        return self::SUCCESS;
    }

    private function runBackfill(
        ChannelAccountBackfiller $backfiller,
        DedupConversation $merger,
        LeadConflictPreflight $preflight,
    ): int {
        $this->line('(a) Tạo channel_accounts: '.$backfiller->createChannelAccounts());
        $this->line('(b) Gắn zalo_connections.channel_account_id: '.$backfiller->attachConnectionsToAccounts());
        $this->line('(c) Backfill conversations.channel_account_id: '.$backfiller->backfillConversationAccountId());

        $conflicts = $preflight->detect();
        $conflictKeys = array_map(
            fn ($c) => $c['channel_account_id'].'|'.$c['sender_uid'],
            $conflicts
        );

        $mergedGroups = 0;
        foreach ($merger->duplicateGroups() as $group) {
            $key = $group->channel_account_id.'|'.$group->sender_uid;
            if (in_array($key, $conflictKeys, true)) {
                continue;
            }
            $merger->mergeGroup($group->channel_account_id, $group->sender_uid);
            $mergedGroups++;
        }
        $this->line("(d) Gộp nhóm trùng: {$mergedGroups} (bỏ qua ".count($conflictKeys).' nhóm both_have_lead)');

        $this->line('(e) Backfill message_source_aliases: '.$backfiller->backfillAliases());

        $written = $preflight->record($conflicts);
        $this->line("(f) Preflight both_have_lead ghi mới: {$written}");

        if ($conflicts !== []) {
            $this->error(count($conflicts).' nhóm both_have_lead — xem bảng lead_merge_conflicts, resolve tay rồi chạy lại --backfill (idempotent). Swap (g) BỊ CHẶN cho tới khi hết conflict.');

            return self::FAILURE;
        }

        $this->info('Backfill (a)-(f) xong, 0 conflict. Swap (g) vẫn HOÃN tới khi P03 (outbound) + P06 (alias contract) live — chạy qua migration riêng.');

        return self::SUCCESS;
    }
}
