<?php

namespace App\Services\Calls\Media\LiveKit;

use App\Services\Calls\Media\MediaProviderFailed;
use Illuminate\Container\Attributes\Config;

final readonly class LiveKitCredentials
{
    public function __construct(
        #[Config('services.livekit.url')] private ?string $url,
        #[Config('services.livekit.api_key')] private ?string $apiKey,
        #[Config('services.livekit.api_secret')] private ?string $apiSecret,
    ) {}

    // Địa chỉ trình duyệt kết nối (ws/wss).
    public function clientUrl(): string
    {
        return $this->required($this->url, 'LIVEKIT_URL');
    }

    // API phòng nằm cùng host, đi http/https.
    public function apiBaseUrl(): string
    {
        return rtrim(preg_replace('/^ws/', 'http', $this->clientUrl()), '/');
    }

    public function apiKey(): string
    {
        return $this->required($this->apiKey, 'LIVEKIT_API_KEY');
    }

    public function apiSecret(): string
    {
        return $this->required($this->apiSecret, 'LIVEKIT_API_SECRET');
    }

    private function required(?string $value, string $envName): string
    {
        if ($value === null || $value === '') {
            throw MediaProviderFailed::because("{$envName} is not configured");
        }

        return $value;
    }
}
