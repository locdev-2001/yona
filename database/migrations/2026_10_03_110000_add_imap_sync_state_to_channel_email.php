<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('channel_email', function (Blueprint $table) {
            $table->jsonb('imap_sync_state')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('channel_email', function (Blueprint $table) {
            $table->dropColumn('imap_sync_state');
        });
    }
};
