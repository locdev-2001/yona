<?php

namespace Database\Factories;

use App\Models\AccessToken;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AccessToken>
 */
class AccessTokenFactory extends Factory
{
    public function definition(): array
    {
        return [
            'owner_type' => 'User',
            'owner_id' => User::factory(),
        ];
    }
}
