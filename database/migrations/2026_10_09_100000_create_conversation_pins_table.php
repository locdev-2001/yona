<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Ghim là của riêng từng nhân viên: mỗi người một danh sách hội thoại ghim.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversation_pins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->timestamps(6);

            $table->unique(['user_id', 'conversation_id']);
            $table->index(['account_id', 'user_id']);
            $table->index('conversation_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversation_pins');
    }
};
