<?php

namespace App\Agent\ValueObjects;

use InvalidArgumentException;

// Khối mờ của nhà cung cấp trong phản hồi mô hình (khối suy luận có chữ ký…). Runtime
// không đọc nội dung, chỉ giữ đúng vị trí trong tin assistant của lượt; driver cùng
// tuyến phát lại nguyên văn, tuyến khác bỏ đi.
final readonly class ProviderBlock
{
    /** @param array<string, mixed> $payload đúng mảng nhà cung cấp trả về, không chuẩn hoá */
    public function __construct(
        // Loại khối theo nhà cung cấp, vd `thinking`, `redacted_thinking`, `reasoning_details`.
        public string $kind,
        public ModelRoute $route,
        public array $payload,
    ) {
        if ($kind === '' || $payload === []) {
            throw new InvalidArgumentException('Provider block needs a kind and a payload.');
        }
    }

    public function belongsTo(ModelRoute $route): bool
    {
        return $this->route->provider === $route->provider && $this->route->model === $route->model;
    }
}
