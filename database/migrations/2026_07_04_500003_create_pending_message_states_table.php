<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P01a — pending BOUNDED cho undo event-đến-trước-tin (Codex BLOCKER-2).
 *
 * KHÔNG phải kho append-only (relay_events drop ở P09): unique
 * (workspace_id, event_type, target_msg_id) + TTL 48h + prune daily
 * (inbox:prune-transient) = có trần. Chỉ undo dùng (nghiệp vụ không được mất);
 * chatty (seen/delivered/reaction) drop-on-miss có chủ đích.
 *
 * channel_account_id: uuid KHÔNG FK — nhất quán conversations.channel_account_id.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pending_message_states', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->uuid('channel_account_id')->nullable();

            $table->string('event_type', 32);
            // msgId đích trên platform — khớp messages.source_id khi tin về sau
            $table->string('target_msg_id', 64);
            $table->jsonb('payload')->default('{}');
            $table->timestamp('expires_at');

            $table->timestamps();

            $table->unique(['workspace_id', 'event_type', 'target_msg_id'], 'pending_msg_states_ws_event_target_unique');
            $table->index('expires_at', 'pending_msg_states_expires_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pending_message_states');
    }
};
