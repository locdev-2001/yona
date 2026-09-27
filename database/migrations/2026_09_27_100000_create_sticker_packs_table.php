<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Bộ sticker: account_id NULL là kho chung của Yona, có giá trị là kho riêng
// của tenant. Chưa có published_at thì chưa ai thấy.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sticker_packs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->integer('position')->default(0);
            $table->timestamp('published_at', 6)->nullable();
            $table->timestamps(6);

            $table->index(['account_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sticker_packs');
    }
};
