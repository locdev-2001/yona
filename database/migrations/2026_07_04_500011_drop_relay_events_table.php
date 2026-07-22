<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * P09 — relay_events NGHỈ HƯU, drop VÔ ĐIỀU KIỆN (founder chốt 04/07: backlog
 * dev data không đáng preserve — pre-check count=0 đã chạy tay trước khi build,
 * KHÔNG code gate). P02 đã chuyển 5 event trạng-thái-tin đi theo messages,
 * unknown → structured log. Kết quả: 0 bảng kho, 0 retention.
 *
 * down(): tạo lại bảng RỖNG (reversible schema, không hồi data) + RLS.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('relay_events');
    }

    public function down(): void
    {
        Schema::create('relay_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();

            $table->uuid('channel_account_id')->nullable();
            $table->foreign('channel_account_id')->references('id')->on('channel_accounts')->nullOnDelete();
            $table->bigInteger('connection_id')->nullable();

            $table->string('event_type', 32);
            $table->string('personal_uid', 64)->nullable();
            $table->string('source_id')->nullable();
            $table->jsonb('payload');
            $table->timestamp('received_at');

            $table->timestamp('created_at')->useCurrent();

            $table->index(['workspace_id', 'event_type', 'received_at'], 'relay_events_ws_type_received_idx');
        });

        DB::statement(
            'CREATE UNIQUE INDEX relay_events_ws_type_source_unique
             ON relay_events (workspace_id, event_type, source_id)
             WHERE source_id IS NOT NULL'
        );

        $db = DB::connection('pgsql_privileged');
        $predicate = "workspace_id = nullif(current_setting('app.current_workspace', true), '')::uuid";
        $db->statement('ALTER TABLE relay_events ENABLE ROW LEVEL SECURITY');
        $db->statement('ALTER TABLE relay_events FORCE ROW LEVEL SECURITY');
        $db->statement("CREATE POLICY ws_isolation ON relay_events USING ({$predicate}) WITH CHECK ({$predicate})");
        $db->statement('GRANT SELECT, INSERT, UPDATE, DELETE ON relay_events TO yona_app');
    }
};
