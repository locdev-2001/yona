<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P01 (inbox-multichannel-relayer) — message_source_aliases: map legacy
 * source_id → message_id, giữ idempotency dedup xuyên migration source_id
 * contract (P06). Backfill 100% (P02e) TRƯỚC khi drop zalo_connection_id.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('message_source_aliases', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('conversation_id')->constrained('conversations')->cascadeOnDelete();
            $table->foreignUuid('message_id')->constrained('messages')->cascadeOnDelete();

            $table->string('source_id');
            $table->string('kind', 16)->default('legacy');

            $table->timestamp('created_at')->useCurrent();

            $table->unique(['conversation_id', 'source_id'], 'message_source_aliases_conv_source_unique');
            $table->index(['workspace_id', 'source_id'], 'message_source_aliases_ws_source_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_source_aliases');
    }
};
