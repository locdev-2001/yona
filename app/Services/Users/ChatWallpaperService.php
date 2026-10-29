<?php

namespace App\Services\Users;

use App\Models\User;
use Closure;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Imagick;
use ImagickException;
use RuntimeException;

/**
 * Hình nền khung chat của riêng từng người, lưu ở `users.ui_settings.chat_wallpaper`:
 * `{ default: Wallpaper|null, conversations: { [conversationId]: Wallpaper } }`, với
 * `Wallpaper = { kind: 'preset', key } | { kind: 'image', url }`. Chỉ người đặt thấy.
 * Dashboard vẽ nền (resources/js/dashboard/conversation/wallpaper); máy chủ giữ dữ
 * liệu hợp lệ và quản lý ảnh tải lên trong kho của Yona.
 */
class ChatWallpaperService
{
    public const UI_SETTINGS_KEY = 'chat_wallpaper';

    // Khớp WALLPAPER_PRESETS ở resources/js/dashboard/conversation/wallpaper/presets.ts.
    public const PRESET_KEYS = ['mist', 'sky', 'mint', 'peach', 'lavender', 'sunset', 'ocean', 'dots', 'grid', 'waves'];

    public const UPLOAD_MIMES = ['jpg', 'jpeg', 'png', 'webp'];

    public const UPLOAD_MAX_KILOBYTES = 5120;

    private const MAX_CONVERSATION_OVERRIDES = 500;

    private const DISK = 'public';

    private const DIRECTORY = 'wallpapers';

    private const LONG_EDGE = 1920;

    private const QUALITY = 80;

    // Cùng ngưỡng với ThumbnailGenerator: lớn hơn thì không giải mã, tránh worker hết RAM.
    private const MAX_SOURCE_PIXELS = 40_000_000;

    /** Luật kiểm cho `ui_settings.chat_wallpaper` trong request cập nhật hồ sơ. */
    public function rules(User $user): array
    {
        $field = 'ui_settings.'.self::UI_SETTINGS_KEY;
        $wallpaperRule = $this->wallpaperRule($user);

        return [
            $field => ['sometimes', 'nullable', 'array:default,conversations'],
            "{$field}.default" => ['nullable', $wallpaperRule],
            "{$field}.conversations" => ['sometimes', 'array', 'max:'.self::MAX_CONVERSATION_OVERRIDES, $this->conversationKeysRule()],
            "{$field}.conversations.*" => ['required', $wallpaperRule],
        ];
    }

    /**
     * Thu nhỏ về cạnh dài 1920px, bỏ EXIF (vị trí chụp) và lưu WebP theo băm nội dung
     * vào thư mục riêng của người dùng. Trả URL công khai để ghi vào ui_settings.
     */
    public function storeImage(User $user, UploadedFile $file): string
    {
        $contents = $this->normalizedImage((string) $file->get());
        $path = $this->userDirectory($user).'/'.sha1($contents).'.webp';

        if (! $this->disk()->exists($path)) {
            $this->disk()->put($path, $contents);
        }

        return $this->disk()->url($path);
    }

    /** Xoá ảnh đã tải mà không còn nền nào dùng (đổi ảnh, bỏ nền, tải rồi không chọn). */
    public function pruneUnreferencedImages(User $user): void
    {
        $referencedPaths = array_map(
            fn (string $url) => $this->userDirectory($user).'/'.basename($url),
            $this->referencedImageUrls($user),
        );

        $unreferencedPaths = array_diff($this->disk()->files($this->userDirectory($user)), $referencedPaths);

        if ($unreferencedPaths !== []) {
            $this->disk()->delete(array_values($unreferencedPaths));
        }
    }

    /** @return list<string> */
    private function referencedImageUrls(User $user): array
    {
        $settings = data_get($user->ui_settings, self::UI_SETTINGS_KEY) ?? [];
        $wallpapers = [$settings['default'] ?? null, ...array_values($settings['conversations'] ?? [])];

        return array_values(array_filter(array_map(
            fn (mixed $wallpaper) => is_array($wallpaper) && ($wallpaper['kind'] ?? null) === 'image' ? $wallpaper['url'] ?? null : null,
            $wallpapers,
        ), 'is_string'));
    }

    private function wallpaperRule(User $user): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($user): void {
            if ($value === null) {
                return;
            }

            $isValid = match (is_array($value) ? ($value['kind'] ?? null) : null) {
                'preset' => $this->hasExactKeys($value, ['kind', 'key']) && in_array($value['key'], self::PRESET_KEYS, true),
                'image' => $this->hasExactKeys($value, ['kind', 'url']) && $this->isOwnImageUrl($user, $value['url']),
                default => false,
            };

            if (! $isValid) {
                $fail('validation.in')->translate();
            }
        };
    }

    private function hasExactKeys(array $value, array $keys): bool
    {
        return array_diff(array_keys($value), $keys) === [] && count($value) === count($keys);
    }

    private function conversationKeysRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            foreach (array_keys((array) $value) as $conversationId) {
                if (! ctype_digit((string) $conversationId)) {
                    $fail('validation.in')->translate();

                    return;
                }
            }
        };
    }

    private function isOwnImageUrl(User $user, mixed $url): bool
    {
        $prefix = $this->disk()->url($this->userDirectory($user)).'/';

        return is_string($url)
            && str_starts_with($url, $prefix)
            && preg_match('/^[0-9a-f]{40}\.webp$/', substr($url, strlen($prefix))) === 1;
    }

    private function normalizedImage(string $imageBytes): string
    {
        try {
            $probe = new Imagick;
            $probe->pingImageBlob($imageBytes);
            $sourcePixels = $probe->getImageWidth() * $probe->getImageHeight();
            $probe->clear();

            if ($sourcePixels > self::MAX_SOURCE_PIXELS) {
                throw new RuntimeException('Wallpaper image is too large to decode.');
            }

            $image = new Imagick;
            $image->readImageBlob($imageBytes);
            $image->setIteratorIndex(0);
            $image->autoOrient();

            if (max($image->getImageWidth(), $image->getImageHeight()) > self::LONG_EDGE) {
                $image->thumbnailImage(self::LONG_EDGE, self::LONG_EDGE, true);
            }

            $image->stripImage();
            $image->setImageFormat('webp');
            $image->setImageCompressionQuality(self::QUALITY);
            $contents = $image->getImageBlob();
            $image->clear();

            return $contents;
        } catch (ImagickException $exception) {
            throw new RuntimeException('Wallpaper image could not be read.', previous: $exception);
        }
    }

    private function userDirectory(User $user): string
    {
        return self::DIRECTORY.'/'.$user->id;
    }

    private function disk(): FilesystemAdapter
    {
        return Storage::disk(self::DISK);
    }
}
