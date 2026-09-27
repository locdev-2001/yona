<?php

namespace Tests\Support;

use App\Models\Account;
use App\Models\Sticker;
use App\Models\StickerPack;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

// Sticker của kho Yona đã xử lý xong, kèm đủ ba tệp trên disk stickers (disk phải
// được Storage::fake trước). Tệp là do pipeline upload dựng; ở đây đặt sẵn.
final class YonaStickers
{
    public const ANIMATION_JSON = '{"v":"5.7.4","fr":30,"ip":0,"op":90,"w":512,"h":512,"layers":[]}';

    /** @param array<string, mixed> $attributes */
    public static function ready(?StickerPack $pack = null, array $attributes = []): Sticker
    {
        $sticker = Sticker::factory()
            ->for($pack ?? StickerPack::factory()->create(), 'stickerPack')
            ->create($attributes);

        $disk = Storage::disk(Sticker::DISK);
        $disk->put($sticker->static_path, UploadedFile::fake()->image('static.png', 512, 512)->getContent());
        $disk->put($sticker->poster_path, 'poster-webp');
        $disk->put($sticker->animation_path, self::ANIMATION_JSON);

        return $sticker;
    }

    public static function tenantPack(Account $account): StickerPack
    {
        return StickerPack::factory()->forAccount($account)->create();
    }

    public static function enableCustomStickers(Account $account, bool $enabled = true): void
    {
        $account->forceFill(['feature_flags' => [...($account->feature_flags ?? []), Sticker::CUSTOM_STICKERS_FEATURE => $enabled]])->save();
    }

    /**
     * Payload sticker Yona phải có đúng các khoá này, KHÔNG có URL.
     *
     * @return array<string, mixed>
     */
    public static function storedPayload(Sticker $sticker): array
    {
        return [
            'source' => 'yona',
            'id' => $sticker->id,
            'pack_id' => $sticker->sticker_pack_id,
            'animation_path' => $sticker->animation_path,
            'poster_path' => $sticker->poster_path,
            'static_path' => $sticker->static_path,
            'width' => $sticker->width,
            'height' => $sticker->height,
        ];
    }

    /**
     * Payload đọc ra ở bề mặt hiển thị: payload lưu + URL dựng lúc đọc.
     *
     * @return array<string, mixed>
     */
    public static function readerPayload(Sticker $sticker): array
    {
        return [
            ...self::storedPayload($sticker),
            'url' => $sticker->static_url,
            'poster_url' => $sticker->poster_url,
            'animation_url' => $sticker->animation_url,
        ];
    }
}
