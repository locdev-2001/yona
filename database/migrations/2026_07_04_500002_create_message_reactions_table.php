<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P01a — reaction per-(message, người thả). Channel-agnostic.
 *
 * Unique (message_id, reactor_uid): mỗi người 1 reaction/tin — đổi icon = update,
 * NONE = delete. reacted_at monotonic guard chống out-of-order (P02 MED-1).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('message_reactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('message_id')->constrained('messages')->cascadeOnDelete();

            // uid người thả trên platform (peer hoặc chính mình qua echo)
            $table->string('reactor_uid', 64);
            $table->string('icon', 16);
            $table->timestamp('reacted_at');

            $table->timestamps();

            $table->unique(['message_id', 'reactor_uid'], 'message_reactions_msg_reactor_unique');
            $table->index(['workspace_id', 'message_id'], 'message_reactions_ws_msg_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_reactions');
    }
};
