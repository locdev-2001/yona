<?php

namespace App\Agent\ValueObjects;

use InvalidArgumentException;

// Khai báo công cụ trung tính nhà cung cấp; tên khớp giao của giới hạn tên các hãng.
final readonly class ToolSpec
{
    public const NAME_PATTERN = '/^[a-z][a-z0-9_]{2,63}$/';

    /** @param array<string, mixed> $inputSchema JSON Schema kiểu object */
    public function __construct(
        public string $name,
        public string $description,
        public array $inputSchema,
        public ToolKind $kind,
    ) {
        if (preg_match(self::NAME_PATTERN, $name) !== 1) {
            throw new InvalidArgumentException("Tool name `{$name}` must match ".self::NAME_PATTERN.'.');
        }

        if (trim($description) === '') {
            throw new InvalidArgumentException("Tool `{$name}` needs a description.");
        }

        if (($inputSchema['type'] ?? null) !== 'object') {
            throw new InvalidArgumentException("Tool `{$name}` input schema must be a JSON Schema object.");
        }
    }
}
