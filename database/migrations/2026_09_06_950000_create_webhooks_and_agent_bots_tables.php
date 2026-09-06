<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('webhooks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inbox_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name')->nullable();
            $table->string('secret')->nullable();
            $table->jsonb('subscriptions')->nullable();
            $table->text('url');
            $table->unsignedSmallInteger('webhook_type')->default(0);
            $table->timestamps(6);

            $table->unique(['account_id', 'url']);
        });

        // account_id nullable: system bot (account_id NULL) dùng chung mọi account.
        Schema::create('agent_bots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name')->nullable();
            $table->string('description')->nullable();
            $table->string('outgoing_url')->nullable();
            $table->string('secret')->nullable();
            $table->unsignedSmallInteger('bot_type')->default(0);
            $table->jsonb('bot_config')->nullable();
            $table->timestamps(6);

            $table->index('account_id');
        });

        Schema::create('agent_bot_inboxes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('agent_bot_id')->constrained()->cascadeOnDelete();
            $table->foreignId('inbox_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('status')->default(0);
            $table->timestamps(6);

            $table->index('account_id');
            $table->index('agent_bot_id');
            $table->index('inbox_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_bot_inboxes');
        Schema::dropIfExists('agent_bots');
        Schema::dropIfExists('webhooks');
    }
};
