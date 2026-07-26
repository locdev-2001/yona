<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P01 (inbox-multichannel-relayer) — lead_merge_conflicts: preflight migration
 * P02(f) ghi nhóm both_have_lead (source + target conv đều có lead khác nhau)
 * để resolve tay. >0 conflict chặn swap unique P02(g).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lead_merge_conflicts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();

            $table->uuid('channel_account_id');
            $table->string('sender_uid');

            $table->uuid('source_conversation_id');
            $table->uuid('target_conversation_id');
            $table->uuid('source_lead_id');
            $table->uuid('target_lead_id');

            $table->timestamp('detected_at');
            $table->timestamp('resolved_at')->nullable();
            $table->text('note')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_merge_conflicts');
    }
};
