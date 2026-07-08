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
        // Global role definitions (reference data, idempotent).
        $this->call(PlatformPermissionSeeder::class); // tenant plane (guard web)
        $this->call(AdminPermissionSeeder::class);    // platform plane (guard admin)

        // Default workspace + admin membership + dev platform-admin (dev only).
        $this->call(FoundationSeeder::class);
    }
}
