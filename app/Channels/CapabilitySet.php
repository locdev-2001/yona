<?php

namespace App\Channels;

/**
 * Tập năng lực BẤT BIẾN của một kênh — docs/channel-capabilities.md §3.
 *
 * Thứ tự luôn theo thứ tự khai báo trong enum, không theo thứ tự người gọi truyền
 * vào, để `values()` dùng làm snapshot ổn định và so sánh được giữa hai lần chạy.
 */
final class CapabilitySet
{
    /** @var list<Capability> */
    private readonly array $capabilities;

    /** Null = kênh chưa khai, coi là chữ trơn (an toàn: khách không thấy cú pháp lạ). */
    private ?TextFormat $declaredTextFormat = null;

    private function __construct(Capability ...$capabilities)
    {
        $unique = [];

        foreach ($capabilities as $capability) {
            $unique[$capability->value] = $capability;
        }

        $this->capabilities = array_values(array_filter(
            Capability::cases(),
            static fn (Capability $capability) => isset($unique[$capability->value]),
        ));
    }

    public static function of(Capability ...$capabilities): self
    {
        return new self(...$capabilities);
    }

    public static function none(): self
    {
        return new self;
    }

    public function has(Capability $capability): bool
    {
        return in_array($capability, $this->capabilities, true);
    }

    /** @return list<string> */
    public function values(): array
    {
        return array_map(static fn (Capability $capability) => $capability->value, $this->capabilities);
    }

    /** @return list<Capability> */
    public function all(): array
    {
        return $this->capabilities;
    }

    public function withTextFormat(TextFormat $format): self
    {
        $copy = new self(...$this->capabilities);
        $copy->declaredTextFormat = $format;

        return $copy;
    }

    public function textFormat(): TextFormat
    {
        return $this->declaredTextFormat ?? TextFormat::Plain;
    }

    public function merge(self $other): self
    {
        $merged = new self(...$this->capabilities, ...$other->capabilities);
        $merged->declaredTextFormat = $other->declaredTextFormat ?? $this->declaredTextFormat;

        return $merged;
    }

    public function isEmpty(): bool
    {
        return $this->capabilities === [];
    }
}
