<?php

namespace App\Services\Branding;

use App\Support\SafeSvg;
use Closure;
use Illuminate\Http\UploadedFile;

// Mỗi chỗ đặt ảnh thương hiệu: định dạng nhận, dung lượng tối đa và tệp mặc
// định khi Super Admin chưa tải ảnh riêng.
enum BrandAssetSlot: string
{
    case Logo = 'logo';
    case LogoDark = 'logo_dark';
    case LogoThumbnail = 'logo_thumbnail';
    case Favicon = 'favicon';

    public const DEFAULT_FAVICON = '/favicon.ico';

    /** @return list<string> */
    public function extensions(): array
    {
        return match ($this) {
            self::Logo, self::LogoDark => ['png', 'svg', 'webp', 'jpg', 'jpeg'],
            self::LogoThumbnail => ['png', 'svg', 'webp'],
            self::Favicon => ['ico', 'png', 'svg'],
        };
    }

    public function maxKilobytes(): int
    {
        return match ($this) {
            self::Logo, self::LogoDark => 2048,
            self::LogoThumbnail => 1024,
            self::Favicon => 512,
        };
    }

    public function defaultUrl(): string
    {
        return match ($this) {
            self::Logo => (string) config('yona.branding.logo'),
            self::LogoDark => (string) config('yona.branding.logo_dark'),
            self::LogoThumbnail => (string) config('yona.branding.logo_thumbnail'),
            self::Favicon => self::DEFAULT_FAVICON,
        };
    }

    /** @return list<mixed> */
    public function uploadRules(): array
    {
        return [
            'required',
            'file',
            'mimes:'.implode(',', $this->extensions()),
            'max:'.$this->maxKilobytes(),
            function (string $attribute, mixed $value, Closure $fail): void {
                if ($value instanceof UploadedFile && self::isSvg($value) && ! SafeSvg::isSafe((string) file_get_contents($value->getRealPath()))) {
                    $fail(__('admin_layout.branding.unsafe_svg'));
                }
            },
        ];
    }

    public static function isSvg(UploadedFile $file): bool
    {
        return $file->guessExtension() === 'svg';
    }
}
