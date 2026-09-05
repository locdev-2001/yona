<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Port từ db/migrate/20250806140000_create_assignment_policies.rb,
// 20250806140001_create_inbox_assignment_policies.rb và
// 20260617000000_add_exclude_older_than_hours_to_assignment_policies.rb
// (gộp làm một vì Yona dựng bảng lần đầu).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assignment_policies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->integer('assignment_order')->default(0);
            $table->integer('conversation_priority')->default(0);
            $table->integer('fair_distribution_limit')->default(100);
            $table->integer('fair_distribution_window')->default(3600);
            $table->boolean('enabled')->default(true);
            $table->integer('exclude_older_than_hours')->nullable()->default(168);
            $table->timestamps(6);

            $table->unique(['account_id', 'name']);
            $table->index('enabled');
        });

        Schema::create('inbox_assignment_policies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inbox_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('assignment_policy_id')->constrained()->cascadeOnDelete();
            $table->timestamps(6);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inbox_assignment_policies');
        Schema::dropIfExists('assignment_policies');
    }
};
