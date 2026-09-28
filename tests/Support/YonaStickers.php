<?php

namespace Tests\Support;

use App\Models\Account;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

// Sticker của kho Yona đã xử lý xong, kèm tệp trên disk stickers (disk phải được
// Storage::fake trước). Tệp là do pipeline tải lên dựng; ở đây đặt sẵn.
final class YonaStickers
{
    public const ANIMATED_FIXTURE = 'tests/Fixtures/stickers/bouncing-dot.gif';

    private const LEGACY_ANIMATION_FILE = 'anim.json';

    private const LEGACY_POSTER_FILE = 'poster.webp';

    /** @param array<string, mixed> $attributes */
    public static function ready(?StickerPack $pack = null, array $attributes = []): Sticker
    {
        $sticker = Sticker::factory()
            ->for($pack ?? StickerPack::factory()->create(), 'stickerPack')
            ->create($attributes);

        $disk = Storage::disk(Sticker::DISK);
        $disk->put($sticker->static_path, self::png(64));
        $disk->put($sticker->image_path, 'sticker-webp');
        $disk->put($sticker->original_path, self::png(256));

        return $sticker;
    }

    /**
     * Sticker Lottie đã dựng xong trước khi chuyển sang ảnh, đúng như migration
     * để lại: ảnh hiển thị là PNG tĩnh cũ, không có ảnh gốc, tệp Lottie còn trong
     * thư mục hash.
     *
     * @param  array<string, mixed>  $attributes
     */
    public static function legacyLottie(?StickerPack $pack = null, array $attributes = []): Sticker
    {
        $sticker = Sticker::factory()
            ->for($pack ?? StickerPack::factory()->create(), 'stickerPack')
            ->create(['original_path' => null, ...$attributes]);
        $sticker->update(['image_path' => $sticker->static_path]);

        $disk = Storage::disk(Sticker::DISK);
        $disk->put($sticker->static_path, self::png(64));
        foreach (self::legacyLottiePaths($sticker) as $path) {
            $disk->put($path, 'lottie-era-file');
        }

        return $sticker;
    }

    /** @return array{animation_path: string, poster_path: string} */
    public static function legacyLottiePaths(Sticker $sticker): array
    {
        $directory = dirname((string) $sticker->static_path);

        return [
            'animation_path' => "{$directory}/".self::LEGACY_ANIMATION_FILE,
            'poster_path' => "{$directory}/".self::LEGACY_POSTER_FILE,
        ];
    }

    /**
     * Payload tin đã lưu thời sticker Lottie: không có `image_path` hay `frames`.
     *
     * @return array<string, mixed>
     */
    public static function legacyStoredPayload(Sticker $sticker): array
    {
        return [
            'source' => 'yona',
            'id' => $sticker->id,
            'pack_id' => $sticker->sticker_pack_id,
            ...self::legacyLottiePaths($sticker),
            'static_path' => $sticker->static_path,
            'width' => 512,
            'height' => 512,
        ];
    }

    /** Ảnh PNG thật: một chấm màu trên nền trắng; màu theo `$seed` để mỗi ảnh một nội dung. */
    public static function imageUpload(string $name = 'sticker.png', int $seed = 1, int $side = 96): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, self::png($side, $seed));
    }

    public static function animatedUpload(string $name = 'bouncing-dot.gif'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, (string) file_get_contents(base_path(self::ANIMATED_FIXTURE)));
    }

    public static function png(int $side, int $seed = 1): string
    {
        $image = imagecreatetruecolor($side, $side);
        imagefill($image, 0, 0, (int) imagecolorallocate($image, 255, 255, 255));
        $dotColor = (int) imagecolorallocate($image, (37 * $seed) % 200, (91 * $seed) % 200, (53 * $seed) % 200);
        imagefilledellipse($image, intdiv($side, 2), intdiv($side, 2), intdiv($side, 2), intdiv($side, 2), $dotColor);

        ob_start();
        imagepng($image);

        return (string) ob_get_clean();
    }

    public static function tenantPack(Account $account): StickerPack
    {
        return StickerPack::factory()->forAccount($account)->create();
    }

    // Thêm email của user vào YONA_SYSTEM_ADMIN_EMAILS của lượt test.
    public static function grantSystemAdmin(User $user): void
    {
        config(['yona.system_admin_emails' => trim(config('yona.system_admin_emails', '').','.$user->email, ',')]);
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
            'image_path' => $sticker->image_path,
            'static_path' => $sticker->static_path,
            'width' => $sticker->width,
            'height' => $sticker->height,
            'frames' => $sticker->frame_count,
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
            'image_url' => $sticker->image_url,
            'url' => $sticker->static_url,
        ];
    }
}
