<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Sample module migration — intentionally NO workspace_id so it doesn't
// trigger RlsPolicyCoverageTest (tenant-scoped tables need RLS policy;
// this is a system-wide log table, no RLS needed).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sample_pings', function (Blueprint $table) {
            $table->id();
            $table->string('source')->default('module');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sample_pings');
    }
};
