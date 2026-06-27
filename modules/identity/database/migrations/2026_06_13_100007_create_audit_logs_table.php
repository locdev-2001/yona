<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Append-only audit trail (BR-X05/X07). No updated_at/deleted_at — there is no
// mutate path. workspace_id is nullable for platform-plane events (login).
// PII-minimized diff in `changes`. Writes go via the privileged connection; the
// app role's UPDATE/DELETE is revoked in setup-roles.sql (phase 05).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->nullable()->constrained('workspaces')->nullOnDelete();
            $table->string('entity_type');
            $table->string('entity_id'); // string: targets may be uuid or bigint
            $table->string('action'); // create|update|delete|restore|reassign|role_change|team_change|login|export|erasure|impersonate_start|impersonate_stop
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor_type')->nullable(); // user|system|platform
            $table->foreignId('impersonated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->jsonb('changes')->nullable();
            $table->jsonb('context')->nullable(); // ip, user_agent, request_id
            $table->timestampTz('occurred_at');

            $table->index(['workspace_id', 'entity_type', 'entity_id', 'occurred_at']);
            $table->index(['workspace_id', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
