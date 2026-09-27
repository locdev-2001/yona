<?php

namespace Database\Factories;

use App\Models\Sticker;
use App\Models\StickerPack;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Sticker> */
class StickerFactory extends Factory
{
    protected $model = Sticker::class;

    public function definition(): array
    {
        $contentHash = hash('sha256', fake()->unique()->uuid());
        $directory = substr($contentHash, 0, 2).'/'.$contentHash;

        return [
            'sticker_pack_id' => StickerPack::factory(),
            'label' => fake()->word(),
            'keywords' => [],
            'animation_path' => "{$directory}/anim.json",
            'poster_path' => "{$directory}/poster.webp",
            'static_path' => "{$directory}/static.png",
            'content_hash' => $contentHash,
            'width' => 512,
            'height' => 512,
            'frame_count' => 90,
            'duration_ms' => 3000,
            'byte_size' => 24_000,
            'status' => Sticker::STATUS_READY,
            'position' => 0,
        ];
    }

    public function processing(): static
    {
        return $this->state([
            'animation_path' => null,
            'poster_path' => null,
            'static_path' => null,
            'status' => Sticker::STATUS_PROCESSING,
        ]);
    }

    public function failed(string $failureCode): static
    {
        return $this->processing()->state([
            'status' => Sticker::STATUS_FAILED,
            'failure_code' => $failureCode,
        ]);
    }
}
