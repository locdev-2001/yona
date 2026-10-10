<?php

namespace App\Channels;

use App\Models\Account;

/**
 * Giao kèo kết nối của một kênh: màn "Thêm kênh" và API đọc từ đây, không map theo
 * `channel_type`. `key` là đường dẫn bước 2 của wizard (settings/inboxes/new/{key});
 * `options` là các lối vào con (vd nhà cung cấp email), mỗi lối khai cách kết nối riêng.
 * `platform` cho thẻ chọn kênh vẽ đúng logo nền tảng mà hộp thư sẽ mang.
 */
final class ChannelConnection
{
    /**
     * @param  list<self>  $options
     * @param  array<string, string|int|bool>  $preset
     * @param  array<string, string>  $startRouteParameters
     */
    private function __construct(
        public readonly string $key,
        public readonly ConnectionMethod $method,
        public readonly bool $available = true,
        public readonly int $order = 100,
        public readonly array $options = [],
        public readonly array $preset = [],
        public readonly ?string $guideUrl = null,
        public readonly ?string $startRoute = null,
        public readonly array $startRouteParameters = [],
        public readonly ?ChannelPlatform $platform = null,
        public readonly bool $comingSoon = false,
    ) {}

    public static function of(string $key, ConnectionMethod $method): self
    {
        return new self($key, $method);
    }

    public function available(bool $available = true): self
    {
        return $this->copy(['available' => $available]);
    }

    /** Lối vào đã định có nhưng chưa mở: vẫn hiện để khách biết, không bắt đầu kết nối được. */
    public function comingSoon(bool $comingSoon = true): self
    {
        return $this->copy(['comingSoon' => $comingSoon]);
    }

    /** Bắt đầu kết nối mới được: đang mở và không ở trạng thái sắp ra mắt. */
    public function startable(): bool
    {
        return $this->available && ! $this->comingSoon;
    }

    /**
     * Tạo hộp thư thẳng bằng form (POST /inboxes) được không. Lối vào chia lựa chọn thì cần
     * một lựa chọn đang mở mà không đi đường riêng (OAuth có trang bắt đầu riêng); lựa chọn
     * sắp ra mắt hay đã bỏ khỏi danh sách đều không tính.
     */
    public function opensByForm(): bool
    {
        if ($this->options === []) {
            return $this->startRoute === null;
        }

        foreach ($this->options as $option) {
            if ($option->startable() && $option->startRoute === null) {
                return true;
            }
        }

        return false;
    }

    public function ordered(int $order): self
    {
        return $this->copy(['order' => $order]);
    }

    public function withOptions(self ...$options): self
    {
        return $this->copy(['options' => array_values($options)]);
    }

    /** @param  array<string, string|int|bool>  $preset */
    public function withPreset(array $preset): self
    {
        return $this->copy(['preset' => $preset]);
    }

    public function withGuideUrl(string $url): self
    {
        return $this->copy(['guideUrl' => $url]);
    }

    /** @param  array<string, string>  $parameters */
    public function startsAt(string $routeName, array $parameters = []): self
    {
        return $this->copy(['startRoute' => $routeName, 'startRouteParameters' => $parameters]);
    }

    public function withPlatform(ChannelPlatform $platform): self
    {
        return $this->copy(['platform' => $platform]);
    }

    /** @return list<self> Lựa chọn hiện trên màn chọn: đang mở hoặc sắp ra mắt. */
    public function listedOptions(): array
    {
        return array_values(array_filter($this->options, static fn (self $option) => $option->available || $option->comingSoon));
    }

    public function option(string $key): ?self
    {
        foreach ($this->options as $option) {
            if ($option->key === $key) {
                return $option;
            }
        }

        return null;
    }

    /** @return array<string, mixed> */
    public function toArray(?Account $account = null): array
    {
        return [
            'key' => $this->key,
            'method' => $this->method->value,
            'available' => $this->available,
            'coming_soon' => $this->comingSoon,
            'preset' => $this->preset === [] ? null : $this->preset,
            'guide_url' => $this->guideUrl,
            'logo_url' => $this->platform?->toArray()['logo_url'],
            'start_url' => $this->startRoute !== null && $account !== null && ! $this->comingSoon
                ? route($this->startRoute, ['account' => $account->id, ...$this->startRouteParameters], false)
                : null,
            'options' => array_map(static fn (self $option) => $option->toArray($account), $this->listedOptions()),
        ];
    }

    /** @param  array<string, mixed>  $changes */
    private function copy(array $changes): self
    {
        return new self(...[
            'key' => $this->key,
            'method' => $this->method,
            'available' => $this->available,
            'order' => $this->order,
            'options' => $this->options,
            'preset' => $this->preset,
            'guideUrl' => $this->guideUrl,
            'startRoute' => $this->startRoute,
            'startRouteParameters' => $this->startRouteParameters,
            'platform' => $this->platform,
            'comingSoon' => $this->comingSoon,
            ...$changes,
        ]);
    }
}
