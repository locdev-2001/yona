<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->firstOrCreate(
            ['email' => 'john@acme.inc'],
            [
                'name' => 'John Kennedy',
                'password' => 'Password1!',
                'confirmed_at' => now(),
            ],
        );
    }
}
