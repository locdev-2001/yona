<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['call_telemetry_events', 'call_telemetry_samples'] as $name) {
            Schema::create($name, function (Blueprint $table) use ($name) {
                $table->id();
                $table->foreignId('call_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('call_participant_id')->nullable()->constrained()->nullOnDelete();
                $table->uuid('client_session_id');
                $table->timestamp('observed_at', 6);
                $table->timestamp('created_at', 6)->useCurrent();
                $table->index(['call_id', 'observed_at']);
                $table->index('created_at');
                if ($name === 'call_telemetry_events') {
                    $table->uuid('event_id');
                    $table->string('event_name', 40);
                    $table->unsignedInteger('elapsed_ms')->nullable();
                    $table->jsonb('attributes');
                    $table->unique(['user_id', 'client_session_id', 'event_id'], 'call_events_client_unique');
                } else {
                    $table->unsignedInteger('sequence');
                    $table->unsignedInteger('interval_ms');
                    $table->jsonb('environment');
                    $table->jsonb('streams');
                    $table->jsonb('performance');
                    $table->unique(['user_id', 'client_session_id', 'sequence'], 'call_samples_client_unique');
                }
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('call_telemetry_samples');
        Schema::dropIfExists('call_telemetry_events');
    }
};
