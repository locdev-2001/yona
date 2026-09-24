<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Bảng `conversation_participants` và `mentions`: cùng bộ cột, cùng unique (user_id, conversation_id) và ba index
// đơn theo từng khóa ngoại.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversation_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->timestamps(6);

            $table->unique(['user_id', 'conversation_id']);
            $table->index('account_id');
            $table->index('conversation_id');
            $table->index('user_id');
        });

        Schema::create('mentions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->timestamp('mentioned_at', 6);
            $table->timestamps(6);

            $table->unique(['user_id', 'conversation_id']);
            $table->index('account_id');
            $table->index('conversation_id');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mentions');
        Schema::dropIfExists('conversation_participants');
    }
};
