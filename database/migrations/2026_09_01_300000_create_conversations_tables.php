<?php

use App\Models\AccessToken;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Bảng conversations + messages +
// access_tokens. display_id sinh qua PG trigger đọc sequence per-account
// (conv_dpid_seq_<account_id>, tạo sẵn từ migration accounts) — quyết định #7.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('access_tokens', function (Blueprint $table) {
            $table->id();
            $table->string('owner_type')->nullable();
            $table->unsignedBigInteger('owner_id')->nullable();
            $table->string('token')->nullable()->unique();
            $table->timestamps(6);

            $table->index(['owner_type', 'owner_id']);
        });

        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inbox_id')->constrained()->cascadeOnDelete();
            $table->integer('status')->default(0);
            $table->foreignId('assignee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('contact_id')->nullable()->constrained()->cascadeOnDelete();
            $table->integer('display_id')->nullable();
            $table->timestamp('contact_last_seen_at', 6)->nullable();
            $table->timestamp('agent_last_seen_at', 6)->nullable();
            $table->jsonb('additional_attributes')->default('{}');
            $table->foreignId('contact_inbox_id')->nullable()->constrained()->cascadeOnDelete();
            $table->uuid('uuid')->unique()->default(DB::raw('gen_random_uuid()'));
            $table->string('identifier')->nullable();
            $table->timestamp('last_activity_at', 6)->useCurrent();
            $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete();
            // campaigns (C4) + SLA/agent-bot (EE/D4) chưa port — cột giữ chỗ, FK thêm khi có bảng.
            $table->unsignedBigInteger('campaign_id')->nullable();
            $table->timestamp('snoozed_until', 6)->nullable();
            $table->jsonb('custom_attributes')->default('{}');
            $table->timestamp('assignee_last_seen_at', 6)->nullable();
            $table->timestamp('first_reply_created_at', 6)->nullable();
            $table->integer('priority')->nullable();
            $table->unsignedBigInteger('sla_policy_id')->nullable();
            $table->timestamp('waiting_since', 6)->nullable();
            $table->text('cached_label_list')->nullable();
            $table->unsignedBigInteger('assignee_agent_bot_id')->nullable();
            $table->string('ai_assignee_type')->nullable();
            $table->timestamp('status_changed_at', 6)->nullable();
            $table->timestamps(6);

            $table->unique(['account_id', 'display_id']);
            $table->index(['account_id', 'id']);
            $table->index(['account_id', 'inbox_id', 'status', 'assignee_id'], 'conv_acid_inbid_stat_asgnid_idx');
            $table->index(['account_id', 'status', 'created_at']);
            $table->index(['assignee_id', 'account_id']);
            $table->index('campaign_id');
            $table->index('created_at');
            $table->index('first_reply_created_at');
            $table->index(['identifier', 'account_id']);
            $table->index('priority');
            $table->index(['status', 'account_id']);
            $table->index(['status', 'priority']);
            $table->index('waiting_since');
        });

        // display_id NOT NULL sau khi trigger đảm nhận việc gán giá trị.
        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION conversations_before_insert_row_tr() RETURNS trigger AS $$
            BEGIN
                NEW.display_id := nextval('conv_dpid_seq_' || NEW.account_id);
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER conversations_before_insert_row_tr BEFORE INSERT ON conversations
            FOR EACH ROW EXECUTE FUNCTION conversations_before_insert_row_tr();

            ALTER TABLE conversations ALTER COLUMN display_id SET NOT NULL;
        SQL);

        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->text('content')->nullable();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inbox_id')->constrained()->cascadeOnDelete();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->integer('message_type');
            $table->boolean('private')->default(false);
            $table->integer('status')->nullable()->default(0);
            $table->text('source_id')->nullable();
            $table->integer('content_type')->default(0);
            $table->json('content_attributes')->default('{}');
            $table->string('sender_type')->nullable();
            $table->unsignedBigInteger('sender_id')->nullable();
            $table->jsonb('external_source_ids')->default('{}');
            $table->jsonb('additional_attributes')->default('{}');
            $table->text('processed_message_content')->nullable();
            $table->jsonb('sentiment')->default('{}');
            $table->timestamps(6);

            $table->index(['account_id', 'content_type', 'created_at'], 'idx_messages_account_content_created');
            $table->index(['account_id', 'created_at', 'message_type'], 'index_messages_on_account_created_type');
            $table->index(['account_id', 'inbox_id']);
            $table->index(['conversation_id', 'account_id', 'message_type', 'created_at'], 'index_messages_on_conversation_account_type_created');
            $table->index('created_at');
            $table->index(['sender_type', 'sender_id', 'created_at'], 'index_messages_on_sender_and_created');
            $table->index(['sender_type', 'sender_id']);
        });

        DB::unprepared(<<<'SQL'
            CREATE INDEX index_messages_on_content ON messages USING gin (content gin_trgm_ops);
            CREATE INDEX index_messages_on_additional_attributes_campaign_id
                ON messages USING gin ((additional_attributes -> 'campaign_id'));
            CREATE INDEX index_messages_on_source_id ON messages (source_id);
        SQL);

        // Morph map mới lưu 'User' thay 'App\Models\User' như bản gốc —
        // dữ liệu polymorphic cũ (avatar attachments) chuyển theo.
        DB::table('attachments')->where('attachable_type', 'App\\Models\\User')->update(['attachable_type' => 'User']);
        DB::table('attachments')->where('attachable_type', 'App\\Models\\Inbox')->update(['attachable_type' => 'Inbox']);
        DB::table('attachments')->where('attachable_type', 'App\\Models\\Contact')->update(['attachable_type' => 'Contact']);

        // AccessTokenable: user đã tồn tại trước migration cũng phải có token.
        User::query()->whereNotIn('id', AccessToken::query()->where('owner_type', 'User')->select('owner_id'))
            ->pluck('id')
            ->each(fn (int $userId) => AccessToken::query()->create([
                'owner_type' => 'User',
                'owner_id' => $userId,
            ]));
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
        DB::unprepared('DROP TRIGGER IF EXISTS conversations_before_insert_row_tr ON conversations');
        DB::unprepared('DROP FUNCTION IF EXISTS conversations_before_insert_row_tr()');
        Schema::dropIfExists('conversations');
        Schema::dropIfExists('access_tokens');
    }
};
