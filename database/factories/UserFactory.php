<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('Password1!'),
            'confirmed_at' => now(),
            'remember_token' => Str::random(10),
        ];
    }

    public function unconfirmed(): static
    {
        return $this->state(fn (array $attributes) => [
            'confirmed_at' => null,
        ]);
    }
}
