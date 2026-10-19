<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Hội thoại giữa người dùng (1-1 và nhóm) dùng chung bảng với hội thoại hộp thư:
// không thuộc account/inbox nào nên hai cột đó được rỗng, và display_id (đánh số
// theo account) chỉ gán khi có account. Hàng có kind là hội thoại giữa người dùng.
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE conversations ALTER COLUMN account_id DROP NOT NULL, ALTER COLUMN inbox_id DROP NOT NULL, ALTER COLUMN display_id DROP NOT NULL');
        DB::statement('ALTER TABLE messages ALTER COLUMN account_id DROP NOT NULL, ALTER COLUMN inbox_id DROP NOT NULL');

        Schema::table('conversations', function (Blueprint $table) {
            $table->smallInteger('kind')->nullable();
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('direct_key', 64)->nullable()->unique();
            $table->unsignedBigInteger('last_message_id')->nullable();
            $table->integer('member_count')->default(0);
            $table->jsonb('settings')->default('{}');
            $table->softDeletes('deleted_at', 6);

            $table->index(['kind', 'last_activity_at']);
        });

        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION conversations_before_insert_row_tr() RETURNS trigger AS $$
            BEGIN
                IF NEW.account_id IS NOT NULL THEN
                    NEW.display_id := nextval('conv_dpid_seq_' || NEW.account_id);
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        SQL);

        Schema::table('messages', function (Blueprint $table) {
            $table->timestamp('edited_at', 6)->nullable();
            $table->uuid('client_id')->nullable();
        });

        DB::statement('CREATE INDEX messages_conversation_client_id_index ON messages (conversation_id, client_id) WHERE client_id IS NOT NULL');
    }

    public function down(): void
    {
        DB::statement('DELETE FROM messages WHERE account_id IS NULL OR inbox_id IS NULL');
        DB::statement('DELETE FROM conversations WHERE account_id IS NULL OR inbox_id IS NULL');

        DB::statement('DROP INDEX IF EXISTS messages_conversation_client_id_index');

        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['edited_at', 'client_id']);
        });

        DB::statement('ALTER TABLE messages ALTER COLUMN account_id SET NOT NULL, ALTER COLUMN inbox_id SET NOT NULL');

        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION conversations_before_insert_row_tr() RETURNS trigger AS $$
            BEGIN
                NEW.display_id := nextval('conv_dpid_seq_' || NEW.account_id);
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        SQL);

        Schema::table('conversations', function (Blueprint $table) {
            $table->dropIndex(['kind', 'last_activity_at']);
            $table->dropConstrainedForeignId('created_by');
            $table->dropUnique(['direct_key']);
            $table->dropColumn(['kind', 'title', 'description', 'direct_key', 'last_message_id', 'member_count', 'settings', 'deleted_at']);
        });

        DB::statement('ALTER TABLE conversations ALTER COLUMN account_id SET NOT NULL, ALTER COLUMN inbox_id SET NOT NULL, ALTER COLUMN display_id SET NOT NULL');
    }
};
