<?php

namespace App\Agent\Inference\Gateway\Drivers;

use App\Agent\ValueObjects\ToolCall;

// Id lời gọi công cụ hợp lệ với mọi giao thức: `[A-Za-z0-9_-]`, tối đa 64 ký tự. Tất
// định và lũy đẳng: id đã hợp lệ giữ nguyên, nên kết quả công cụ luôn khớp lời gọi.
final class ToolCallId
{
    private const VALID_PATTERN = '/^[A-Za-z0-9_-]{1,64}$/';

    private const NORMALIZED_PREFIX = 'call_';

    public static function normalize(string $id): string
    {
        if (preg_match(self::VALID_PATTERN, $id) === 1) {
            return $id;
        }

        return self::NORMALIZED_PREFIX.substr(hash('sha256', $id), 0, ToolCall::MAX_ID_LENGTH - strlen(self::NORMALIZED_PREFIX));
    }
}
