<?php

namespace App\Agent\Inference\Gateway;

use App\Agent\ValueObjects\ModelRoute;
use SensitiveParameter;

// Một tuyến đã giải xong từ config: nhà cung cấp + mô hình + mọi tham số để gọi.
// Mang khoá API nên không bao giờ được ghi log hay đưa vào ApiCallRecord.
final readonly class Route
{
    public const MAX_TOKENS_FIELDS = ['max_tokens', 'max_completion_tokens'];

    /** @param array<string, string> $headers header phụ (không chứa khoá) */
    public function __construct(
        public string $provider,
        public Protocol $protocol,
        public string $baseUrl,
        #[SensitiveParameter] public string $apiKey,
        public string $model,
        public int $maxOutputTokens,
        public CacheMode $cacheMode,
        public ModelPrice $price,
        public int $timeoutSeconds,
        public array $headers = [],
        public string $maxTokensField = 'max_tokens',
    ) {}

    public function identity(): ModelRoute
    {
        return new ModelRoute($this->provider, $this->model);
    }

    public function endpoint(string $path): string
    {
        return rtrim($this->baseUrl, '/').$path;
    }
}
