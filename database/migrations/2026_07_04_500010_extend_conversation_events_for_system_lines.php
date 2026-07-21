<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * P08 — dòng hệ thống (taxonomy loại 3): kind mới group_system|friend_system.
 * payload jsonb {act, label, ...} · dedup_key = source_id envelope (hash ổn định
 * per-event từ bridge) → unique partial = idempotent với bridge retry.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversation_events', function (Blueprint $table) {
            $table->jsonb('payload')->nullable();
            $table->string('dedup_key', 80)->nullable();
        });

        DB::statement(
            'CREATE UNIQUE INDEX conversation_events_dedup_key_unique
             ON conversation_events (workspace_id, dedup_key)
             WHERE dedup_key IS NOT NULL'
        );
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS conversation_events_dedup_key_unique');
        Schema::table('conversation_events', function (Blueprint $table) {
            $table->dropColumn(['payload', 'dedup_key']);
        });
    }
};
