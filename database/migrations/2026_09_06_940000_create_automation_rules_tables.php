<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('automation_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('event_name');
            $table->jsonb('conditions')->default('[]');
            $table->jsonb('actions')->default('[]');
            $table->boolean('active')->default(true);
            $table->unsignedInteger('execution_delay')->nullable();
            $table->timestamps(6);

            $table->index('account_id');
            $table->index(['account_id', 'event_name', 'active']);
        });

        Schema::create('automation_rule_pending_executions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('automation_rule_id')->constrained()->cascadeOnDelete();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('message_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('due_at', 6);
            $table->string('episode_key');
            $table->string('skip_reason')->nullable();
            $table->unsignedSmallInteger('status')->default(0);
            $table->timestamps(6);

            $table->unique(
                ['automation_rule_id', 'conversation_id', 'episode_key'],
                'uniq_automation_pending_execution_episode',
            );
            $table->index(['status', 'updated_at'], 'automation_pending_status_updated_idx');
            $table->index(['status', 'due_at'], 'automation_pending_status_due_idx');
            $table->index('account_id');
            $table->index('automation_rule_id');
            $table->index('conversation_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('automation_rule_pending_executions');
        Schema::dropIfExists('automation_rules');
    }
};
