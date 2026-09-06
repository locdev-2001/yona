<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use OTPHP\TOTP;

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

    // Bật sẵn 2FA (khoá bí mật TOTP + cờ bắt buộc) cho test đăng nhập hai bước.
    public function withMfa(): static
    {
        return $this->state(fn (array $attributes) => [
            'otp_secret' => TOTP::generate()->getSecret(),
            'otp_required_for_login' => true,
        ]);
    }

    public function unconfirmed(): static
    {
        return $this->state(fn (array $attributes) => [
            'confirmed_at' => null,
        ]);
    }
}
