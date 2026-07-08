<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Phase-07 (cdp-dedup) — partial unique + draft index.
 *
 * 1. Detect trùng (workspace_id, phone) trước khi tạo index.
 *    Nếu có trùng → throw RuntimeException rõ ràng (KHÔNG auto-merge).
 *
 * 2. Partial unique index (workspace_id, phone) WHERE phone IS NOT NULL AND deleted_at IS NULL
 *    — detect-and-abort: firstOrCreateByPhone bắt unique-violation rồi re-fetch.
 *
 * 3. Index (workspace_id) để query draft contact (client_id IS NULL) nhanh.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Detect duplicate trước khi tạo constraint ─────────────────────────
        // Dùng raw SQL vì PostgreSQL không cho phép alias trong HAVING clause.
        $duplicates = DB::select(
            'SELECT workspace_id, phone, COUNT(*) AS cnt
             FROM contacts
             WHERE phone IS NOT NULL AND deleted_at IS NULL
             GROUP BY workspace_id, phone
             HAVING COUNT(*) > 1'
        );

        if (! empty($duplicates)) {
            $sample = $duplicates[0];
            throw new RuntimeException(
                'Phát hiện SĐT trùng trước khi tạo partial unique index. '.
                "workspace_id={$sample->workspace_id}, phone={$sample->phone}, count={$sample->cnt}. ".
                'Giải quyết thủ công trước khi chạy migration này.'
            );
        }

        // ── Partial unique: 1 số/workspace (cho contact chưa bị xóa mềm) ─────
        DB::statement(
            'CREATE UNIQUE INDEX contacts_workspace_phone_unique
             ON contacts (workspace_id, phone)
             WHERE phone IS NOT NULL AND deleted_at IS NULL'
        );

        // ── Draft contact query: workspace_id index ───────────────────────────
        DB::statement(
            'CREATE INDEX IF NOT EXISTS contacts_workspace_id_idx ON contacts (workspace_id)'
        );
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS contacts_workspace_phone_unique');
        DB::statement('DROP INDEX IF EXISTS contacts_workspace_id_idx');
    }
};
