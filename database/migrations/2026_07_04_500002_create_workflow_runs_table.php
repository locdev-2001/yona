<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Automation — workflow_runs: 1 row = 1 lần enroll của 1 subject.
 * Partial unique (workflow_id, subject_type, subject_id) WHERE status='running'
 * chặn double-enroll. Index (status, resume_at) cho cron resume query.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workflow_runs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignUuid('workflow_id')->constrained('workflows')->cascadeOnDelete();

            $table->string('subject_type', 16); // lead|contact|conversation
            $table->uuid('subject_id');
            $table->string('current_node_id')->nullable();
            $table->string('status', 16)->default('running'); // running|waiting|completed|failed
            $table->timestamp('resume_at')->nullable();
            $table->integer('loop_count')->default(0);

            $table->timestamps();
        });

        DB::statement('
            CREATE UNIQUE INDEX workflow_runs_enroll_unique
            ON workflow_runs (workflow_id, subject_type, subject_id)
            WHERE status = \'running\'
        ');

        DB::statement("
            CREATE INDEX workflow_runs_waiting_resume_idx
            ON workflow_runs (status, resume_at)
            WHERE status = 'waiting'
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('workflow_runs');
    }
};
