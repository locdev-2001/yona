<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->string('bank_bin', 6);
            $table->string('bank_code', 20);
            $table->string('account_number', 30);
            $table->string('account_name', 100);
            $table->string('memo_template', 100)->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('allow_all_agents')->default(true);
            $table->timestamps(6);

            $table->unique(['account_id', 'bank_bin', 'account_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_accounts');
    }
};
