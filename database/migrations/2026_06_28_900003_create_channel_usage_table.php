<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// RLS-scoped: channel_usage đếm hội thoại per-workspace per-channel per-month.
// unique(workspace_id, channel, period) cho atomic upsert ON CONFLICT DO UPDATE.
// period = 'YYYY-MM' char(7), ví dụ '2026-06'.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('channel_usage', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('workspace_id');
            $table->string('channel', 64);
            $table->char('period', 7); // 'YYYY-MM'
            $table->integer('answered_count')->default(0);
            $table->timestamps();

            // Unique đảm bảo atomic upsert ON CONFLICT (workspace_id, channel, period)
            $table->unique(['workspace_id', 'channel', 'period'], 'channel_usage_ws_channel_period_unique');
            $table->index(['workspace_id', 'channel']);
        });

        // RLS: workspace isolation
        $predicate = "workspace_id = nullif(current_setting('app.current_workspace', true), '')::uuid";
        DB::statement('ALTER TABLE channel_usage ENABLE ROW LEVEL SECURITY');
        DB::statement('ALTER TABLE channel_usage FORCE ROW LEVEL SECURITY');
        DB::statement('DROP POLICY IF EXISTS ws_isolation ON channel_usage');
        DB::statement("CREATE POLICY ws_isolation ON channel_usage USING ({$predicate}) WITH CHECK ({$predicate})");
        DB::statement('GRANT SELECT, INSERT, UPDATE, DELETE ON channel_usage TO crm_app');
    }

    public function down(): void
    {
        Schema::dropIfExists('channel_usage');
    }
};
