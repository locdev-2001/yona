<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Port từ db/schema.rb Chatwoot v4.17.1: bảng campaigns. display_id sinh qua PG
// trigger đọc sequence per-account (camp_dpid_seq_<account_id>, tạo sẵn từ
// migration accounts) — cùng lối conversations, quyết định #7.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->integer('display_id')->nullable();
            $table->string('title');
            $table->text('description')->nullable();
            $table->text('message');
            $table->foreignId('sender_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('enabled')->default(true);
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inbox_id')->constrained()->cascadeOnDelete();
            $table->jsonb('trigger_rules')->default('{}');
            $table->integer('campaign_type')->default(0);
            $table->integer('campaign_status')->default(0);
            $table->jsonb('audience')->default('[]');
            $table->timestamp('scheduled_at', 6)->nullable();
            $table->boolean('trigger_only_during_business_hours')->default(false);
            $table->jsonb('template_params')->nullable();
            $table->timestamp('started_at', 6)->nullable();
            $table->timestamp('completed_at', 6)->nullable();
            $table->timestamps(6);

            $table->index('campaign_status');
            $table->index('campaign_type');
            $table->index('scheduled_at');
        });

        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION campaigns_before_insert_row_tr() RETURNS trigger AS $$
            BEGIN
                NEW.display_id := nextval('camp_dpid_seq_' || NEW.account_id);
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER campaigns_before_insert_row_tr BEFORE INSERT ON campaigns
            FOR EACH ROW EXECUTE FUNCTION campaigns_before_insert_row_tr();

            ALTER TABLE campaigns ALTER COLUMN display_id SET NOT NULL;
        SQL);

        // has_many :conversations, dependent: :nullify — cột đã có từ B3, giờ mới
        // có bảng đích để gắn khoá ngoại.
        Schema::table('conversations', function (Blueprint $table) {
            $table->foreign('campaign_id')->references('id')->on('campaigns')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropForeign(['campaign_id']);
        });

        DB::unprepared('DROP TRIGGER IF EXISTS campaigns_before_insert_row_tr ON campaigns');
        DB::unprepared('DROP FUNCTION IF EXISTS campaigns_before_insert_row_tr()');
        Schema::dropIfExists('campaigns');
    }
};
