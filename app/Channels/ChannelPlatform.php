<?php

namespace App\Channels;

/**
 * Nền tảng mà một hộp thư nói chuyện qua — kênh tự khai (DeclaresPlatform).
 *
 * `key` là hợp đồng công khai (payload API + tên tệp logo): đổi giá trị là breaking
 * change. Logo là tệp tĩnh public/brand-assets/platforms/{key}.svg — test hợp đồng
 * bắt thiếu tệp. Tên nền tảng là tên thương hiệu nên không dịch.
 */
final class ChannelPlatform
{
    private const LOGO_DIRECTORY = 'brand-assets/platforms';

    private const UNKNOWN_KEY = 'unknown';

    private function __construct(
        public readonly string $key,
        public readonly string $name,
    ) {}

    public static function of(string $key, string $name): self
    {
        return new self($key, $name);
    }

    public static function unknown(): self
    {
        return new self(self::UNKNOWN_KEY, '');
    }

    public function logoPath(): string
    {
        return self::LOGO_DIRECTORY."/{$this->key}.svg";
    }

    /** @return array{key: string, name: string, logo_url: string} */
    public function toArray(): array
    {
        return [
            'key' => $this->key,
            'name' => $this->name,
            'logo_url' => asset($this->logoPath()),
        ];
    }
}
