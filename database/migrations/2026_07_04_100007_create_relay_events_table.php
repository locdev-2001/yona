<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * P10 (inbox-multichannel-relayer) — relay_events: kho L4 chứa event bridge
 * chưa có handler product (undo/seen/delivered/reaction/typing/connected…)
 * thay vì webhook drop im lặng (red-team H1).
 *
 * KHÔNG tính metering (F1/F14 — chỉ đếm khi tenant trả lời tin, đây là kho
 * quan sát, không phải message). Unique partial (workspace_id, event_type,
 * source_id) WHERE source_id IS NOT NULL → idempotent khi bridge retry.
 */
return new class extends Migration
{
    public function up(): void
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
    }

    public function down(): void
    {
        Schema::dropIfExists('relay_events');
    }
};
