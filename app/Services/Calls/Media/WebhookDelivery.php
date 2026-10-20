<?php

namespace App\Services\Calls\Media;

// Một lần nhà cung cấp gọi webhook: thân thô (để kiểm chữ ký trên đúng từng byte) và header.
final readonly class WebhookDelivery
{
    /** @param  array<string, string>  $headers  tên header viết thường */
    public function __construct(
        public string $body,
        public array $headers,
    ) {}

    public function header(string $name): ?string
    {
        return $this->headers[strtolower($name)] ?? null;
    }
}
