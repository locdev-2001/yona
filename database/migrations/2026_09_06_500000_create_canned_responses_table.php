<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Bảng `canned_responses`: đúng 4 cột
// nghiệp vụ, không index nào ngoài khóa chính — uniqueness (short_code trong
// account) là validate ở tầng nhận input, y bản gốc.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('canned_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->string('short_code')->nullable();
            $table->text('content')->nullable();
            $table->timestamps(6);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('canned_responses');
    }
};
