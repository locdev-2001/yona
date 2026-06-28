<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// GLOBAL — no workspace_id, no RLS (scoped by notifiable user, analogous to
// the `announcements` table). Laravel's standard notifications table; do NOT
// add workspace_id here. All access MUST go through $user->notifications().
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');     // → users (notifiable_type / notifiable_id)
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
