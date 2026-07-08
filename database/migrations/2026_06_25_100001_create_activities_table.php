<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Append-only activity timeline (B4: merged from Perfex tblleadactivitylog/tblsalesactivity/
// tblprojectactivity). One table, polymorphic subject, actor snapshot. No soft-delete
// (immutable), no lock_version, no updated_by — ghi một lần, không sửa.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();

            // Polymorphic subject (Lead, Client, Project, Task…)
            $table->string('subject_type');        // morph alias (enforced by P03 morphMap)
            $table->uuid('subject_id');

            // Actor: user (bigint hybrid 13a) or contact (P06, nullable now)
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->uuid('actor_contact_id')->nullable(); // FK added at P06 when contacts exist
            $table->string('actor_name')->nullable();     // denormalized snapshot — audit-safe

            // Action key (i18n, vd: 'lead.created', 'task.assigned', 'reminder.due')
            $table->string('action');

            // Context payload — replaces Perfex serialized additional_data
            $table->jsonb('payload')->default(DB::raw("'{}'::jsonb"));

            // Gate for client portal (P09 project visibility)
            $table->boolean('visible_to_customer')->default(false);

            $table->timestampTz('occurred_at');

            // System columns (no updated_by — append-only)
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            // Timeline index: workspace + subject + time (covers most queries)
            $table->index(['workspace_id', 'subject_type', 'subject_id', 'occurred_at'], 'activities_timeline_idx');
            // Actor feed index
            $table->index(['workspace_id', 'actor_id'], 'activities_actor_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activities');
    }
};
