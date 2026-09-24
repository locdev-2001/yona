<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Bảng `labels` + thiết kế lại phần gán
// nhãn: bỏ gem acts_as_taggable_on (bảng tags/taggings đa ngữ cảnh, tagger,
// context) — `taggings` ở đây chỉ nối `labels` với một bản ghi trong cùng
// account, khóa ngoại thật nên xóa nhãn là gỡ liên kết luôn.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('labels', function (Blueprint $table) {
            $table->id();
            $table->string('title')->nullable();
            $table->text('description')->nullable();
            $table->string('color')->default('#1f93ff');
            $table->boolean('show_on_sidebar')->nullable();
            $table->foreignId('account_id')->nullable()->constrained()->cascadeOnDelete();
            $table->timestamps(6);

            $table->unique(['title', 'account_id']);
        });

        Schema::create('taggings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('label_id')->constrained()->cascadeOnDelete();
            $table->morphs('taggable');
            $table->timestamps(6);

            $table->unique(['label_id', 'taggable_type', 'taggable_id']);
            $table->index(['account_id', 'label_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('taggings');
        Schema::dropIfExists('labels');
    }
};
