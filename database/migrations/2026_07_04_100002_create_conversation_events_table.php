<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P01 (inbox-multichannel-relayer) — conversation_events: dấu ngăn mất tin
 * (kind='session_gap') trong luồng stream hợp nhất (P05).
 *
 * stream_at/stream_rank: khoá sort chung với messages cho keyset cursor.
 * Unique(conversation_id, kind, gap_started_at): idempotent — reconnect nhiều
 * lần không nhân marker. KHÔNG đụng metering/unread/preview.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversation_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('conversation_id')->constrained('conversations')->cascadeOnDelete();

            $table->string('kind', 32);
            $table->timestamp('gap_started_at');
            $table->timestamp('gap_ended_at')->nullable();

            $table->timestamp('stream_at');
            $table->smallInteger('stream_rank');

            $table->timestamp('created_at')->useCurrent();

            $table->unique(['conversation_id', 'kind', 'gap_started_at'], 'conversation_events_idempotent_unique');
            $table->index(['workspace_id', 'conversation_id', 'stream_at'], 'conversation_events_stream_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversation_events');
    }
};
