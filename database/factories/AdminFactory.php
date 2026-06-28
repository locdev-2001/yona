<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Models\Admin;

/**
 * @extends Factory<Admin>
 *
 * Factories run unguarded, so `status` (server-controlled) is persisted here.
 */
class AdminFactory extends Factory
{
    protected $model = Admin::class;

    protected static ?string $password;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'status' => 'active',
            'locale' => 'vi',
            'timezone' => 'Asia/Ho_Chi_Minh',
            'remember_token' => Str::random(10),
        ];
    }

    public function locked(): static
    {
        return $this->state(fn () => ['status' => 'locked']);
    }
}
