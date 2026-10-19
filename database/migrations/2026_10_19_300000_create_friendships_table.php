<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Bạn bè giữa người dùng Yona: một dòng cho mỗi cặp người, theo cả hai chiều. Lời mời
// đang chờ là 'pending', chấp nhận thành 'accepted'; từ chối, huỷ lời mời hay huỷ kết
// bạn thì xoá dòng.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('friendships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('requester_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('addressee_id')->constrained('users')->cascadeOnDelete();
            $table->string('status', 16)->default('pending');
            $table->timestamp('accepted_at', 6)->nullable();
            $table->timestamps(6);

            $table->index('addressee_id');
        });

        DB::statement('ALTER TABLE friendships ADD CONSTRAINT friendships_not_self CHECK (requester_id <> addressee_id)');
        DB::statement('CREATE UNIQUE INDEX friendships_pair_unique ON friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id))');
    }

    public function down(): void
    {
        Schema::dropIfExists('friendships');
    }
};
