<?php

namespace Database\Factories;

use App\Models\Sticker;
use App\Models\StickerPack;
use App\Services\Stickers\StickerFileLayout;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Sticker> */
class StickerFactory extends Factory
{
    protected $model = Sticker::class;

    public function definition(): array
    {
        $contentHash = hash('sha256', fake()->unique()->uuid());

        return [
            'sticker_pack_id' => StickerPack::factory(),
            'label' => fake()->word(),
            'keywords' => [],
            ...StickerFileLayout::renderedPaths($contentHash),
            'original_path' => StickerFileLayout::originalPath($contentHash, 'png'),
            'edit_params' => null,
            'content_hash' => $contentHash,
            'width' => 64,
            'height' => 64,
            'frame_count' => 1,
            'duration_ms' => 0,
            'byte_size' => 2_400,
            'status' => Sticker::STATUS_READY,
            'position' => 0,
        ];
    }

    public function processing(): static
    {
        return $this->state([
            'image_path' => null,
            'static_path' => null,
            'gif_path' => null,
            'frame_count' => null,
            'duration_ms' => null,
            'byte_size' => null,
            'status' => Sticker::STATUS_PROCESSING,
        ]);
    }

    public function failed(string $failureCode): static
    {
        return $this->processing()->state([
            'original_path' => null,
            'status' => Sticker::STATUS_FAILED,
            'failure_code' => $failureCode,
        ]);
    }
}
