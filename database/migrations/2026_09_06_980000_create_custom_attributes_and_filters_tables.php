<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('custom_attribute_definitions', function (Blueprint $table) {
            $table->id();
            $table->string('attribute_display_name')->nullable();
            $table->string('attribute_key')->nullable();
            $table->integer('attribute_display_type')->default(0);
            $table->integer('default_value')->nullable();
            $table->integer('attribute_model')->default(0);
            $table->foreignId('account_id')->nullable()->constrained()->cascadeOnDelete();
            $table->timestamps(6);
            $table->text('attribute_description')->nullable();
            $table->jsonb('attribute_values')->default('[]');
            $table->string('regex_pattern')->nullable();
            $table->string('regex_cue')->nullable();

            $table->index('account_id');
            $table->unique(['attribute_key', 'attribute_model', 'account_id'], 'attribute_key_model_index');
        });

        Schema::create('custom_filters', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->integer('filter_type')->default(0);
            $table->jsonb('query')->default('{}');
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps(6);

            $table->index('account_id');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_filters');
        Schema::dropIfExists('custom_attribute_definitions');
    }
};
