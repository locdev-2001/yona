<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable()->default('');
            $table->string('email')->nullable();
            $table->string('phone_number')->nullable();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->jsonb('additional_attributes')->default('{}');
            $table->string('identifier')->nullable();
            $table->jsonb('custom_attributes')->default('{}');
            $table->timestamp('last_activity_at', 6)->nullable();
            $table->integer('contact_type')->nullable()->default(0);
            $table->string('middle_name')->nullable()->default('');
            $table->string('last_name')->nullable()->default('');
            $table->string('location')->nullable()->default('');
            $table->string('country_code')->nullable()->default('');
            $table->boolean('blocked')->default(false);
            // companies là tính năng enterprise — cột giữ chỗ theo schema gốc, không FK.
            $table->unsignedBigInteger('company_id')->nullable();
            $table->timestamps(6);

            $table->index('account_id');
            $table->index(['account_id', 'contact_type']);
            $table->index('blocked');
            $table->index('company_id');
            $table->index(['phone_number', 'account_id']);
            $table->unique(['email', 'account_id'], 'uniq_email_per_account_contact');
            $table->unique(['identifier', 'account_id'], 'uniq_identifier_per_account_contact');
        });

        DB::statement('CREATE INDEX index_contacts_on_lower_email_account_id ON contacts (lower(email), account_id)');
        DB::statement('CREATE INDEX index_contacts_on_account_id_and_last_activity_at ON contacts (account_id, last_activity_at DESC NULLS LAST)');
        DB::statement("CREATE INDEX index_contacts_on_nonempty_fields ON contacts (account_id, email, phone_number, identifier) WHERE email <> '' OR phone_number <> '' OR identifier <> ''");
        DB::statement("CREATE INDEX index_resolved_contact_account_id ON contacts (account_id) WHERE email <> '' OR phone_number <> '' OR identifier <> ''");
        DB::statement('CREATE INDEX index_contacts_on_name_email_phone_number_identifier ON contacts USING gin (name gin_trgm_ops, email gin_trgm_ops, phone_number gin_trgm_ops, identifier gin_trgm_ops)');

        Schema::create('contact_inboxes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contact_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('inbox_id')->nullable()->constrained()->cascadeOnDelete();
            $table->text('source_id');
            $table->boolean('hmac_verified')->default(false);
            $table->string('pubsub_token')->nullable()->unique();
            $table->timestamps(6);

            $table->index('contact_id');
            $table->index('inbox_id');
            $table->index('source_id');
            $table->unique(['inbox_id', 'source_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_inboxes');
        Schema::dropIfExists('contacts');
    }
};
