<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P07 — Message entity. Immutable log per hội thoại.
 *
 * direction: in (inbound từ peer), out (tenant gửi từ inbox/phone).
 * source_id: msgId từ platform — unique(conversation_id, source_id) idempotency (F14).
 * Message IMMUTABLE — không softDeletes (xem plan §F17: chỉ Conversation soft-delete).
 * media_meta: jsonb cho width/height/duration/size/mime tùy loại media.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('conversation_id')->constrained('conversations')->cascadeOnDelete();

            // Chiều tin nhắn
            $table->string('direction'); // 'in' | 'out'

            // Loại nội dung
            $table->string('type')->default('text'); // text/image/gif/video/audio/file/sticker/business_card/link/quote

            // Nội dung
            $table->text('body')->nullable();
            $table->string('media_url')->nullable();
            $table->jsonb('media_meta')->default('{}');

            // Idempotency: msgId từ platform (F14)
            $table->string('source_id')->nullable();

            // Timestamp từ platform (không dùng created_at để sort)
            $table->timestamp('platform_sent_at')->nullable();

            // Sender info
            $table->string('sender_uid')->nullable();
            $table->string('sender_name')->nullable();

            // User gửi (tenant) — nullable khi inbound từ peer
            $table->unsignedBigInteger('sent_by')->nullable();
            $table->foreign('sent_by')->references('id')->on('users')->nullOnDelete();

            $table->timestamps();

            // Idempotency per conversation + platform msgId (F14)
            $table->unique(['conversation_id', 'source_id'], 'messages_conv_source_unique');

            // Performance: load messages theo conversation + time
            $table->index(['workspace_id', 'conversation_id', 'platform_sent_at'], 'messages_ws_conv_time_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
