<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\UserSession;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UserSession>
 */
class UserSessionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'client_id' => $this->faker->uuid(),
            'ip_address' => $this->faker->ipv4(),
            'user_agent' => 'Mozilla/5.0',
            'browser_name' => 'Chrome',
            'browser_version' => '120.0',
            'device_name' => 'Unknown',
            'platform_name' => 'macOS',
            'platform_version' => '14.0',
            'last_activity_at' => now(),
        ];
    }
}
