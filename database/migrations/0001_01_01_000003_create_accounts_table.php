<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('locale', 10)->default('en');
            $table->string('domain', 100)->nullable();
            $table->string('support_email', 100)->nullable();
            $table->jsonb('feature_flags')->default('{}');
            $table->integer('auto_resolve_duration')->nullable();
            $table->jsonb('limits')->default('{}');
            $table->jsonb('custom_attributes')->default('{}');
            $table->integer('status')->default(0);
            $table->jsonb('internal_attributes')->default('{}');
            $table->jsonb('settings')->default('{}');
            $table->timestamps();

            $table->index('status');
        });

        Schema::create('account_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->integer('role')->default(0);
            $table->foreignId('inviter_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('active_at')->nullable();
            $table->integer('availability')->default(0);
            $table->boolean('auto_offline')->default(true);
            $table->timestamps();

            $table->unique(['account_id', 'user_id'], 'uniq_user_id_per_account_id');
        });

        // Giữ hành vi Chatwoot: mỗi account có sequence display_id riêng cho
        // conversations/campaigns, tạo bằng trigger ngay khi insert account.
        DB::unprepared(<<<'SQL'
            CREATE OR REPLACE FUNCTION accounts_after_insert_row_tr() RETURNS trigger AS $$
            BEGIN
                EXECUTE format('CREATE SEQUENCE IF NOT EXISTS conv_dpid_seq_%s', NEW.id);
                EXECUTE format('CREATE SEQUENCE IF NOT EXISTS camp_dpid_seq_%s', NEW.id);
                RETURN NULL;
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER accounts_after_insert_row_tr AFTER INSERT ON accounts
            FOR EACH ROW EXECUTE FUNCTION accounts_after_insert_row_tr();
        SQL);
    }

    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS accounts_after_insert_row_tr ON accounts');
        DB::unprepared('DROP FUNCTION IF EXISTS accounts_after_insert_row_tr()');
        Schema::dropIfExists('account_users');
        Schema::dropIfExists('accounts');
    }
};
