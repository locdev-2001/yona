<?php

namespace App\Services\Calls\Media;

use Carbon\CarbonImmutable;

// Vé vào phòng giao cho trình duyệt: kết nối tới `serverUrl` bằng `token`.
final readonly class JoinTicket
{
    public function __construct(
        public string $serverUrl,
        public string $token,
        public CarbonImmutable $expiresAt,
    ) {}

    /** @return array{server_url: string, token: string, expires_at: string} */
    public function toArray(): array
    {
        return [
            'server_url' => $this->serverUrl,
            'token' => $this->token,
            'expires_at' => $this->expiresAt->toIso8601String(),
        ];
    }
}
