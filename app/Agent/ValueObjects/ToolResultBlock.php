<?php

namespace App\Agent\ValueObjects;

use InvalidArgumentException;

// Kết quả một lời gọi công cụ đã tuần tự hoá (JSON) để gửi lại mô hình.
final readonly class ToolResultBlock
{
    public function __construct(
        public string $toolCallId,
        public string $content,
        public bool $isError = false,
    ) {
        if ($toolCallId === '' || mb_strlen($toolCallId) > ToolCall::MAX_ID_LENGTH) {
            throw new InvalidArgumentException('Tool result must reference a tool call id of 1-64 characters.');
        }
    }
}
