<?php

namespace Database\Factories\Channel;

use App\Models\Account;
use App\Models\Channel\Zalo;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Zalo>
 */
class ZaloFactory extends Factory
{
    protected $model = Zalo::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'zalo_uid' => (string) fake()->unique()->numerify('##########'),
            'display_name' => fake()->name(),
            'phone' => '+8490'.fake()->unique()->numerify('#######'),
            'state' => Zalo::STATE_CONNECTED,
            'last_connected_at' => now(),
        ];
    }

    public function qrWaiting(): static
    {
        return $this->state([
            'zalo_uid' => null,
            'display_name' => null,
            'phone' => null,
            'state' => Zalo::STATE_QR_WAITING,
            'last_connected_at' => null,
        ]);
    }

    public function sessionLost(): static
    {
        return $this->state([
            'state' => Zalo::STATE_SESSION_LOST,
            'session_lost_reason' => 'session expired',
            'last_session_lost_at' => now(),
        ]);
    }
}
