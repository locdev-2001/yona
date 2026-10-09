<?php

namespace App\Services\Branding;

use App\Models\InstallationConfig;
use Illuminate\Container\Attributes\Scoped;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

// Nguồn DUY NHẤT cấp URL logo/favicon cho mọi bề mặt (layout blade, dashboard,
// trang công khai, widget, console quản trị, thông báo đẩy). Super Admin tải ảnh
// lên thì dùng ảnh đó, chưa tải thì về tệp mặc định trong config('yona.branding').
//
// Tên tệp mang mã băm nội dung: đổi ảnh là đổi URL, nên CDN/trình duyệt giữ bản
// cũ vĩnh viễn (immutable) cũng không hiện nhầm.
#[Scoped]
class BrandAssets
{
    public const CONFIG_NAME = 'BRAND_ASSETS';

    private const DISK = 'public';

    private const DIRECTORY = 'branding';

    private const CACHE_KEY = 'branding.assets';

    private const HASH_LENGTH = 16;

    private const FAVICON_TYPES = ['ico' => 'image/x-icon', 'png' => 'image/png', 'svg' => 'image/svg+xml'];

    /** @var array<string, string>|null */
    private ?array $storedPaths = null;

    public function url(BrandAssetSlot $slot): string
    {
        $path = $this->storedPaths()[$slot->value] ?? null;

        return $path === null ? $slot->defaultUrl() : Storage::disk(self::DISK)->url($path);
    }

    public function isCustom(BrandAssetSlot $slot): bool
    {
        return isset($this->storedPaths()[$slot->value]);
    }

    public function logo(): string
    {
        return $this->url(BrandAssetSlot::Logo);
    }

    public function logoDark(): string
    {
        return $this->url(BrandAssetSlot::LogoDark);
    }

    public function logoThumbnail(): string
    {
        return $this->url(BrandAssetSlot::LogoThumbnail);
    }

    /**
     * Thẻ <link rel="icon"> cho <head>. Chưa có favicon riêng thì giữ bộ tệp
     * mặc định ở public/ (ico + png 32/16).
     *
     * @return list<array{href: string, type?: string, sizes?: string}>
     */
    public function faviconLinks(): array
    {
        $path = $this->storedPaths()[BrandAssetSlot::Favicon->value] ?? null;

        if ($path === null) {
            return [
                ['href' => BrandAssetSlot::DEFAULT_FAVICON, 'sizes' => 'any'],
                ['href' => '/favicon-32x32.png', 'type' => 'image/png', 'sizes' => '32x32'],
                ['href' => '/favicon-16x16.png', 'type' => 'image/png', 'sizes' => '16x16'],
            ];
        }

        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return [array_filter([
            'href' => Storage::disk(self::DISK)->url($path),
            'type' => self::FAVICON_TYPES[$extension] ?? null,
        ])];
    }

    public function store(BrandAssetSlot $slot, UploadedFile $file): string
    {
        $contents = (string) file_get_contents($file->getRealPath());
        $extension = $file->guessExtension() ?: strtolower($file->getClientOriginalExtension());
        $hash = substr(hash('sha256', $contents), 0, self::HASH_LENGTH);
        $path = self::DIRECTORY."/{$slot->value}-{$hash}.{$extension}";

        Storage::disk(self::DISK)->put($path, $contents);

        $previousPath = $this->storedPaths()[$slot->value] ?? null;
        $this->persist([...$this->storedPaths(), $slot->value => $path]);

        if ($previousPath !== null && $previousPath !== $path) {
            Storage::disk(self::DISK)->delete($previousPath);
        }

        return $this->url($slot);
    }

    public function reset(BrandAssetSlot $slot): void
    {
        $paths = $this->storedPaths();
        $previousPath = $paths[$slot->value] ?? null;

        if ($previousPath === null) {
            return;
        }

        unset($paths[$slot->value]);
        $this->persist($paths);
        Storage::disk(self::DISK)->delete($previousPath);
    }

    /** @return array<string, string> */
    private function storedPaths(): array
    {
        return $this->storedPaths ??= Cache::rememberForever(self::CACHE_KEY, function (): array {
            $value = InstallationConfig::valueOf(self::CONFIG_NAME);

            return is_array($value) ? array_filter($value, fn (mixed $path, mixed $slot) => is_string($slot)
                && BrandAssetSlot::tryFrom($slot) !== null
                && is_string($path)
                && $path !== '', ARRAY_FILTER_USE_BOTH) : [];
        });
    }

    /** @param array<string, string> $paths */
    private function persist(array $paths): void
    {
        // `locked`: bản ghi chỉ sửa qua màn Thương hiệu, không hiện ở bảng biến cấu hình.
        InstallationConfig::query()->updateOrCreate(
            ['name' => self::CONFIG_NAME],
            ['value' => $paths, 'locked' => true],
        );

        Cache::forget(self::CACHE_KEY);
        $this->storedPaths = $paths;
    }
}
