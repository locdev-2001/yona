<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Nối luồng vào tầng định danh.
 *
 * `profile_id` trên `conversations` là phi chuẩn hóa CÓ CHỦ ĐÍCH: nó cho phép
 * trả lời "người này có nhắn riêng không" bằng một lần đọc index, không join.
 * Gộp hồ sơ thì cột này được trỏ lại — đó là cái giá đã biết.
 *
 * Cả hai NULL với luồng nhóm: một nhóm không phải một con người.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->uuid('identity_id')->nullable()->after('sender_uid');
            $table->uuid('profile_id')->nullable()->after('identity_id');
            // Nhóm: đây là tên thật của nhóm. 1-1: bản cache tên người, làm mới mỗi tin đến.
            $table->string('thread_name')->nullable()->after('thread_kind');
            $table->string('thread_avatar')->nullable()->after('thread_name');
        });

        DB::connection('pgsql_privileged')->statement(
            'CREATE INDEX conversations_ws_profile_kind_idx
             ON conversations (workspace_id, profile_id, thread_kind)'
        );
    }

    public function down(): void
    {
        DB::connection('pgsql_privileged')->statement('DROP INDEX IF EXISTS conversations_ws_profile_kind_idx');

        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn(['identity_id', 'profile_id', 'thread_name', 'thread_avatar']);
        });
    }
};
