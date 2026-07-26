<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P07 — Conversation entity. Inbox hội thoại per-channel.
 *
 * F23: contact_id nullable default NULL (IS NULL = "Liên hệ nháp").
 * F17/F26: deleted_at soft-delete (opt-out = ẩn mềm, không xóa cứng).
 * F1: last_metered_period (Y-m) — compare-set atomic metering.
 * Unique(zalo_connection_id, sender_uid): idempotent upsert per-channel-per-peer (F14).
 * Unique(workspace_id, conversation_number): số thứ tự human-readable per workspace.
 * lead_id: no FK (cross-module isolation N1).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();

            // Kênh + connection
            $table->string('channel')->default('zalo_personal');
            $table->uuid('zalo_connection_id')->nullable(); // no FK — channel-zalo module riêng

            // Peer info
            $table->string('sender_uid');
            $table->smallInteger('thread_type')->default(0); // 0=user, 1=group
            $table->string('peer_phone')->nullable();
            $table->string('peer_name')->nullable();
            $table->string('peer_avatar_url')->nullable();

            // Cross-module refs (no FK — N1 module isolation)
            $table->uuid('contact_id')->nullable(); // F23: NULL = Liên hệ nháp
            $table->uuid('lead_id')->nullable();    // no FK cross-module

            // Human-readable số thứ tự per workspace
            $table->integer('conversation_number')->default(0);

            // Last message cache
            $table->timestamp('last_message_at')->nullable();
            $table->text('last_message_preview')->nullable();
            $table->unsignedInteger('unread_count')->default(0);

            // Metering (F1): Y-m của kỳ đã đếm, NULL = chưa đếm kỳ nào
            $table->string('last_metered_period')->nullable();

            // Optimistic lock
            $table->unsignedInteger('lock_version')->default(0);

            // Audit
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();

            $table->timestamps();
            $table->softDeletes(); // F17/F26: opt-out = ẩn mềm

            // Idempotent upsert per-channel-per-peer (F14)
            $table->unique(['zalo_connection_id', 'sender_uid'], 'conversations_channel_peer_unique');

            // Human-readable number unique per workspace
            $table->unique(['workspace_id', 'conversation_number'], 'conversations_workspace_number_unique');

            // Performance: list sorted by last activity
            $table->index(['workspace_id', 'last_message_at'], 'conversations_ws_last_message_idx');

            // Soft-delete filter index (F17)
            $table->index(['workspace_id', 'deleted_at'], 'conversations_ws_deleted_at_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
