<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P01c (inbox-full-messaging-framework) — nguồn SĐT cho quy tắc #1 CDP + rule #3
 * (ghi nguồn). Thứ tự mạnh: manual_verified > business_card > friend_profile >
 * unverified — service so strength, KHÔNG ghi đè nguồn mạnh bằng nguồn yếu.
 * A1 founder: consent-by-conduct — KHÔNG cột consent.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->string('phone_source', 32)->nullable();
            $table->timestamp('phone_verified_at')->nullable();
            $table->timestamp('phone_enriched_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn(['phone_source', 'phone_verified_at', 'phone_enriched_at']);
        });
    }
};
