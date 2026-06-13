<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Workspace = one customer organization, the hard data-isolation boundary
// (crm-authorization-model.md). NOT workspace-scoped itself; no RLS policy.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workspaces', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->char('base_currency', 3)->default('VND'); // BR-D05 one base currency
            $table->string('timezone')->default('Asia/Ho_Chi_Minh');
            $table->string('locale', 5)->default('vi');
            $table->uuid('default_pipeline_id')->nullable(); // FK added when pipelines ship
            $table->string('audit_retention')->default('1y'); // BR-X05
            $table->string('status')->default('active'); // active|suspended
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workspaces');
    }
};
