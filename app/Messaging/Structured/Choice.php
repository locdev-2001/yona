<?php

namespace App\Messaging\Structured;

/** Một lựa chọn khách trả lời được: bấm trong widget, bấm nút kênh, hoặc gõ số. */
final readonly class Choice
{
    public function __construct(
        public string $value,
        public string $label,
    ) {}
}
