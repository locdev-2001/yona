<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\StickerPack;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<StickerPack> */
class StickerPackFactory extends Factory
{
    protected $model = StickerPack::class;

    // Mặc định là bộ đã xuất bản của kho chung.
    public function definition(): array
    {
        return [
            'account_id' => null,
            'name' => 'Bộ '.fake()->unique()->numberBetween(1, 999999),
            'position' => 0,
            'published_at' => now(),
        ];
    }

    public function forAccount(Account $account): static
    {
        return $this->state(['account_id' => $account->id]);
    }

    public function unpublished(): static
    {
        return $this->state(['published_at' => null]);
    }
}
