<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Fix: conversations.zalo_connection_id sai type uuid → bigint.
 *
 * connection_id bridge là bigint (global sequence zalo_connection_id_seq),
 * không phải uuid. Migration 700001 đặt sai type.
 *
 * Dùng raw SQL vì Blueprint->change() uuid→bigint không được Doctrine hỗ trợ tốt.
 * USING cast: convert uuid text representation → bigint (chỉ đúng với data đã là numeric string hoặc NULL).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE conversations ALTER COLUMN zalo_connection_id TYPE bigint USING (zalo_connection_id::text::bigint)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE conversations ALTER COLUMN zalo_connection_id TYPE uuid USING (zalo_connection_id::text::uuid)');
    }
};
