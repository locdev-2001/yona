<?php

namespace App\Agent\Inference\Gateway\Throttle;

use App\Agent\ValueObjects\ModelError;
use App\Agent\ValueObjects\ModelErrorKind;
use Throwable;

// Nơi DUY NHẤT phân loại lỗi gọi mô hình cho mọi giao thức. Loại lỗi quyết định thử
// lại, đổi tuyến hay dừng (Failure).
final class ErrorClassifier
{
    private const RETRYABLE_STATUSES = [408, 409, 425, 429, 500, 502, 503, 504, 529];

    private const AUTH_STATUSES = [401, 402, 403];

    // Dấu hiệu prompt vượt cửa sổ ngữ cảnh trong thân lỗi 400 của các nhà cung cấp.
    private const CONTEXT_EXCEEDED_MARKERS = [
        'context_length_exceeded',
        'prompt is too long',
        'maximum context length',
        'context window',
    ];

    private const MESSAGE_MAX_LENGTH = 500;

    /** @param array<string, mixed>|null $body */
    public function fromHttp(int $status, ?array $body, ?string $retryAfter = null): Failure
    {
        $kind = match (true) {
            $status === 400 && $this->mentionsContextExceeded($body) => ModelErrorKind::ContextExceeded,
            in_array($status, self::RETRYABLE_STATUSES, true), $status >= 500 => ModelErrorKind::Retryable,
            in_array($status, self::AUTH_STATUSES, true) => ModelErrorKind::Auth,
            default => ModelErrorKind::InvalidRequest,
        };

        return new Failure(
            new ModelError($kind, $this->providerMessage($body) ?? "Provider returned HTTP {$status}.", $status),
            $kind === ModelErrorKind::Retryable ? $this->retryAfterSeconds($retryAfter) : null,
        );
    }

    public function fromTransport(Throwable $exception): Failure
    {
        return new Failure(new ModelError(
            ModelErrorKind::Retryable,
            $this->clip('Connection to provider failed: '.$exception->getMessage()),
        ));
    }

    public function fromUnreadableResponse(int $status, string $reason): Failure
    {
        return new Failure(new ModelError(ModelErrorKind::Retryable, $this->clip("Unreadable provider response: {$reason}"), $status));
    }

    /** @param array<string, mixed>|null $body */
    private function mentionsContextExceeded(?array $body): bool
    {
        if ($body === null) {
            return false;
        }

        $haystack = mb_strtolower((string) json_encode($body['error'] ?? $body, JSON_UNESCAPED_UNICODE));

        foreach (self::CONTEXT_EXCEEDED_MARKERS as $marker) {
            if (str_contains($haystack, $marker)) {
                return true;
            }
        }

        return false;
    }

    /** @param array<string, mixed>|null $body */
    private function providerMessage(?array $body): ?string
    {
        $error = $body['error'] ?? null;
        $message = is_array($error) ? ($error['message'] ?? null) : $error;

        return is_string($message) && trim($message) !== '' ? $this->clip($message) : null;
    }

    private function retryAfterSeconds(?string $header): ?float
    {
        return $header !== null && is_numeric(trim($header)) ? max(0.0, (float) trim($header)) : null;
    }

    private function clip(string $message): string
    {
        return mb_substr($message, 0, self::MESSAGE_MAX_LENGTH);
    }
}
