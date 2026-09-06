<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('data_imports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->string('data_type');
            $table->integer('status')->default(0);
            $table->text('processing_errors')->nullable();
            $table->integer('total_records')->nullable();
            $table->integer('processed_records')->nullable();
            $table->string('name')->nullable();
            $table->string('source_type')->nullable();
            $table->string('source_provider')->nullable();
            $table->jsonb('import_types')->default('[]');
            $table->foreignId('initiated_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('access_token')->nullable();
            $table->jsonb('source_metadata')->default('{}');
            $table->jsonb('stats')->default('{}');
            $table->jsonb('cursor')->default('{}');
            $table->timestamp('started_at', 6)->nullable();
            $table->timestamp('completed_at', 6)->nullable();
            $table->timestamp('abandoned_at', 6)->nullable();
            $table->timestamp('last_error_at', 6)->nullable();
            $table->timestamps(6);

            $table->index('account_id');
            $table->index('source_provider');
        });

        Schema::create('data_import_errors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('data_import_id')->constrained()->cascadeOnDelete();
            $table->string('source_object_type')->nullable();
            $table->string('source_object_id')->nullable();
            $table->string('error_code');
            $table->text('message')->nullable();
            $table->jsonb('details')->default('{}');
            $table->timestamps(6);

            $table->index('data_import_id');
            $table->index(['source_object_type', 'source_object_id'], 'idx_data_import_errors_on_source');
        });

        // ActiveStorage cho phép nhiều tệp có tên khác nhau trên cùng bản ghi
        // (import_file, failed_records, contacts_export). Bảng attachments dùng
        // chung chưa phân biệt được vai trò → thêm cột `role`.
        Schema::table('attachments', function (Blueprint $table) {
            $table->string('role')->nullable()->after('attachable_id');
        });
    }

    public function down(): void
    {
        Schema::table('attachments', function (Blueprint $table) {
            $table->dropColumn('role');
        });

        Schema::dropIfExists('data_import_errors');
        Schema::dropIfExists('data_imports');
    }
};
