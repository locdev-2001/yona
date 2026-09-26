<?php

namespace App\Messaging\Delivery;

use App\Messaging\Structured\StructuredTypeRegistry;
use App\Models\Message;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

/**
 * Ảnh thẻ (satori + resvg, `services/zalo-bridge/src/card-render`) cho tin có
 * cấu trúc trên kênh không có dạng gốc nhưng nhận được ảnh (phase-06 §6b).
 * `POST /render/card` nằm CHUNG tiến trình với cầu nối Zalo — dùng lại cấu hình
 * `zalo.bridge.*` chứ không phải vì tính năng này chỉ dành riêng cho Zalo (bất
 * kỳ kênh nào khai `Capability::OutboundImage` đều dùng được qua `DeliveryPlanner`).
 */
final class CardImageService
{
    /** Tăng khi đổi khuôn vẽ ở bridge — buộc bỏ cache ảnh cũ dù payload không đổi. */
    private const RENDERER_VERSION = 1;

    private const DISK = 'public';

    private const TIMEOUT_SECONDS = 3;

    public function __construct(private readonly StructuredTypeRegistry $registry) {}

    /** @return string|null URL công khai của ảnh PNG; null nếu bridge chưa cấu hình hoặc render lỗi. */
    public function for(Message $message): ?string
    {
        $bridgeUrl = trim((string) config('zalo.bridge.url'));
        $sendSecret = (string) config('zalo.bridge.send_secret');

        if ($bridgeUrl === '' || $sendSecret === '') {
            // Chưa bật tính năng ở môi trường này (vd local chưa chạy bridge) — im
            // lặng bỏ ảnh, KHÔNG ghi log lỗi (khác với render thật sự thất bại).
            return null;
        }

        $kind = $message->contentTypeName();
        $attributes = $kind === null ? null : $this->registry->read($message);

        if ($kind === null || $attributes === null) {
            return null;
        }

        $path = 'card-images/'.self::cacheKey($kind, $attributes).'.png';
        $disk = Storage::disk(self::DISK);

        if ($disk->exists($path)) {
            return $disk->url($path);
        }

        $png = self::render($kind, $attributes, $bridgeUrl, $sendSecret);

        if ($png === null) {
            DegradeLog::recordImageFailed($message);

            return null;
        }

        $disk->put($path, $png);

        return $disk->url($path);
    }

    private static function render(string $kind, array $attributes, string $bridgeUrl, string $sendSecret): ?string
    {
        try {
            $response = Http::withHeaders(['X-Bridge-Send-Secret' => $sendSecret])
                ->timeout(self::TIMEOUT_SECONDS)
                ->post(rtrim($bridgeUrl, '/').'/render/card', ['kind' => $kind, 'attributes' => $attributes]);
        } catch (ConnectionException) {
            return null;
        }

        return $response->successful() ? $response->body() : null;
    }

    /** @param  array<string, mixed>  $attributes */
    private static function cacheKey(string $kind, array $attributes): string
    {
        return hash('sha256', (string) json_encode([
            'kind' => $kind,
            'attributes' => $attributes,
            'renderer_version' => self::RENDERER_VERSION,
        ]));
    }
}
