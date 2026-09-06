<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Portal;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Portal> */
class PortalFactory extends Factory
{
    protected $model = Portal::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'name' => $this->faker->unique()->sentence(3),
            'slug' => Str::random(16),
        ];
    }
}
