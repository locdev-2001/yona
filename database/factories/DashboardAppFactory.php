<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\DashboardApp;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<DashboardApp> */
class DashboardAppFactory extends Factory
{
    protected $model = DashboardApp::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'user_id' => User::factory(),
            'title' => fake()->words(2, true),
            'content' => [['type' => 'frame', 'url' => 'https://'.fake()->domainName().'/app']],
        ];
    }
}
