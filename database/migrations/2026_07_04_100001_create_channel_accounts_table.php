<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P01 (inbox-multichannel-relayer) — channel_accounts: danh tính "SIM" ổn định
 * theo account_uid (getOwnId), tách khỏi session slot (zalo_connections).
 *
 * gap_started_at/gap_open: cửa sổ gap account-level, materialize marker ở P05.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('channel_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();

            $table->string('channel')->default('zalo_personal');
            $table->string('account_uid', 64);
            $table->string('display_name')->nullable();
            $table->string('avatar_url')->nullable();

            // needs_qr | connected | session_lost
            $table->string('status', 32)->default('needs_qr');

            $table->timestamp('gap_started_at')->nullable();
            $table->boolean('gap_open')->default(false);

            $table->timestamps();

            $table->unique(['workspace_id', 'channel', 'account_uid'], 'channel_accounts_ws_channel_uid_unique');
            $table->index(['workspace_id', 'status'], 'channel_accounts_ws_status_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('channel_accounts');
    }
};
