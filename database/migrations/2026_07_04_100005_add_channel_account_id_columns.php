<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P01 (inbox-multichannel-relayer) — additive: cột channel_account_id nullable
 * trên conversations + zalo_connections. Backfill NOT NULL/swap unique ở P02.
 *
 * conversations.channel_account_id: KHÔNG FK — core không ràng cứng module,
 * đồng bộ pattern zalo_connection_id cũ (cũng no-FK).
 * zalo_connections.channel_account_id: FK channel_accounts, nullOnDelete.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->uuid('channel_account_id')->nullable()->after('zalo_connection_id');
            $table->index('channel_account_id', 'conversations_channel_account_id_idx');
        });

        Schema::table('zalo_connections', function (Blueprint $table) {
            $table->foreignUuid('channel_account_id')->nullable()->after('connection_id')
                ->constrained('channel_accounts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('zalo_connections', function (Blueprint $table) {
            $table->dropConstrainedForeignId('channel_account_id');
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->dropIndex('conversations_channel_account_id_idx');
            $table->dropColumn('channel_account_id');
        });
    }
};
