<?php

namespace App\Agent\ValueObjects;

use InvalidArgumentException;

// {ok: true, data, hint?} | {ok: false, error: {code, fix, retryable}}. Lỗi luôn kèm
// hướng sửa để mô hình tự chữa ở bước sau.
final readonly class ToolResult
{
    /** @param array<string, mixed>|list<mixed> $data */
    private function __construct(
        public bool $ok,
        public array $data = [],
        public ?string $hint = null,
        public ?ToolErrorCode $errorCode = null,
        public ?string $fix = null,
        public bool $retryable = false,
    ) {
        if (! $ok && ($errorCode === null || trim((string) $fix) === '')) {
            throw new InvalidArgumentException('A failed tool result needs an error code and a non-empty fix.');
        }
    }

    /** @param array<string, mixed>|list<mixed> $data */
    public static function success(array $data, ?string $hint = null): self
    {
        return new self(true, $data, $hint);
    }

    public static function failure(ToolErrorCode $code, string $fix, bool $retryable = false): self
    {
        return new self(false, errorCode: $code, fix: $fix, retryable: $retryable);
    }

    /** @return array<string, mixed> hình dạng mô hình nhận trong tool_result */
    public function toArray(): array
    {
        if (! $this->ok) {
            return ['ok' => false, 'error' => ['code' => $this->errorCode?->value, 'fix' => $this->fix, 'retryable' => $this->retryable]];
        }

        return ['ok' => true, 'data' => $this->data, ...($this->hint === null ? [] : ['hint' => $this->hint])];
    }
}
