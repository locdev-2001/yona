<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Tab "Cập nhật" của widget: bài khuyến mãi, hàng mới, thông báo của shop.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('widget_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            // Null = hiện ở mọi hộp thư website của account.
            $table->foreignId('inbox_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('body')->nullable();
            $table->string('cover_url', 2000)->nullable();
            $table->string('tag', 20)->default('notice');
            $table->string('cta_label', 40)->nullable();
            $table->string('cta_url', 2000)->nullable();
            $table->timestamp('published_at', 6)->nullable();
            $table->timestamps(6);

            $table->index(['account_id', 'published_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('widget_updates');
    }
};
