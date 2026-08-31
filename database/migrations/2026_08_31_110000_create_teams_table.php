<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('allow_auto_assign')->default(true);
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            // schema.rb: icon/icon_color chỉ có default '' (không null:false) —
            // middleware ConvertEmptyStringsToNull gửi null khi form để trống.
            $table->string('icon')->nullable()->default('');
            $table->string('icon_color')->nullable()->default('');
            $table->timestamps();

            $table->index('account_id');
            $table->unique(['name', 'account_id']);
        });

        Schema::create('team_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['team_id', 'user_id']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_members');
        Schema::dropIfExists('teams');
    }
};
