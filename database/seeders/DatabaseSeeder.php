<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Global workspace-role definitions (reference data, idempotent).
        $this->call(PlatformPermissionSeeder::class);

        // Default workspace + admin membership for existing users (dev).
        $this->call(FoundationSeeder::class);
    }
}
