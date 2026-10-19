<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Nhóm giữa người dùng Yona: tin của nhóm lưu một bản trong hội thoại gốc thuộc một
// account ẩn của riêng nhóm; mỗi thành viên có một dòng hội thoại trong hộp thư Yona
// của mình trỏ tới hội thoại gốc đó (conversations.thread_conversation_id).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('yona_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('conversation_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('avatar_path')->nullable();
            $table->text('description')->nullable();
            $table->foreignId('created_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->integer('member_count')->default(0);
            $table->timestamps(6);
        });

        Schema::create('yona_group_invite_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('yona_group_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('token_digest')->unique();
            $table->timestamp('expires_at', 6)->nullable();
            $table->integer('max_uses')->nullable();
            $table->integer('use_count')->default(0);
            $table->timestamp('revoked_at', 6)->nullable();
            $table->timestamps(6);
        });

        Schema::create('yona_group_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('yona_group_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('conversation_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('role', 16);
            $table->string('joined_via', 16);
            $table->foreignId('added_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('yona_group_invite_link_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('left_at', 6)->nullable();
            $table->timestamps(6);

            $table->unique(['yona_group_id', 'user_id']);
            $table->index(['user_id', 'left_at']);
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->foreignId('thread_conversation_id')->nullable()->after('contact_inbox_id')
                ->constrained('conversations')->cascadeOnDelete();
            $table->index('thread_conversation_id');
        });

        DB::statement("ALTER TABLE yona_group_members ADD CONSTRAINT yona_group_members_role_check CHECK (role IN ('admin', 'member'))");
        DB::statement("ALTER TABLE yona_group_members ADD CONSTRAINT yona_group_members_joined_via_check CHECK (joined_via IN ('creator', 'added', 'invite_link'))");
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('thread_conversation_id');
        });
        Schema::dropIfExists('yona_group_members');
        Schema::dropIfExists('yona_group_invite_links');
        Schema::dropIfExists('yona_groups');
    }
};
