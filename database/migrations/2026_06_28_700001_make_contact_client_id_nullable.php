<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Phase-07 (cdp-dedup) — B1: Contact.client_id nullable.
 *
 * Forward-only (KHÔNG migrate:fresh).
 *
 * 3 bước bắt buộc (F12: Blueprint foreignUuid->constrained không tự nới NOT NULL):
 *   1. DROP FK contacts_client_id_foreign
 *   2. ALTER COLUMN client_id DROP NOT NULL
 *   3. Re-add FK nullable ON DELETE CASCADE
 *
 * Sau migration: client_id IS NULL = "Liên hệ nháp" (tạo qua inbox/cdp, chưa gắn Client).
 * client_id IS NOT NULL = Contact gắn với Client (route /clients/{id}/contacts như trước).
 */
return new class extends Migration
{
    public function up(): void
    {
        // Detect duplicate (workspace_id, phone) trước khi tạo partial unique
        // Migration này chỉ làm nullable — partial unique ở migration riêng (700002).

        // 1. Drop FK constraint cũ (NOT NULL + FK)
        DB::statement('ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_client_id_foreign');

        // 2. Nới NOT NULL
        DB::statement('ALTER TABLE contacts ALTER COLUMN client_id DROP NOT NULL');

        // 3. Re-add FK nullable, ON DELETE CASCADE (khi Client bị xóa, Contact giữ nguyên
        //    với client_id = NULL thay vì cascade delete — giữ lịch sử). Dùng SET NULL.
        DB::statement(
            'ALTER TABLE contacts ADD CONSTRAINT contacts_client_id_foreign
             FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL'
        );
    }

    public function down(): void
    {
        // Revert: Set NULL rows would break NOT NULL — only safe if no NULL rows exist.
        // ponytail: down() có thể fail nếu đã có contact không có client_id.
        DB::statement('ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_client_id_foreign');
        DB::statement('ALTER TABLE contacts ALTER COLUMN client_id SET NOT NULL');
        DB::statement(
            'ALTER TABLE contacts ADD CONSTRAINT contacts_client_id_foreign
             FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE'
        );
    }
};
