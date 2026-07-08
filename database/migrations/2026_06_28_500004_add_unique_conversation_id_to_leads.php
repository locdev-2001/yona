<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Finding 15 — Partial unique index leads(conversation_id) WHERE conversation_id IS NOT NULL.
 *
 * Mục tiêu: double-submit 2 request đồng thời tạo Lead cho cùng 1 conversation →
 * DB ném 23505 → ConversationLeadController re-fetch Lead đã tồn tại (idempotent).
 *
 * Partial index (WHERE NOT NULL) cho phép nhiều Lead không có conversation_id (Lead offline).
 * Không dùng Blueprint::unique() vì nó không hỗ trợ WHERE clause.
 * Forward-only: down() drop index (safe rollback).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(
            'CREATE UNIQUE INDEX IF NOT EXISTS leads_conversation_id_unique '.
            'ON leads (conversation_id) WHERE conversation_id IS NOT NULL'
        );
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS leads_conversation_id_unique');
    }
};
