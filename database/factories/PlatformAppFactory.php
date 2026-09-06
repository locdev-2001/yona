<?php

namespace Database\Factories;

use App\Models\PlatformApp;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PlatformApp>
 */
class PlatformAppFactory extends Factory
{
    public function definition(): array
    {
        return ['name' => $this->faker->company()];
    }
}
