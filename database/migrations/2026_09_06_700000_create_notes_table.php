<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Ghi chú gắn với liên hệ (bảng `notes` của Chatwoot).
        Schema::create('notes', function (Blueprint $table) {
            $table->id();
            $table->text('content');
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('contact_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps(6);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notes');
    }
};
