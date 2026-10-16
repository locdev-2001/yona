<?php

namespace App\Agent\ValueObjects;

// Kết quả lưu thông tin khách: trường đã ghi và trường bỏ qua kèm lý do.
final readonly class ProfileUpdate
{
    /**
     * @param  list<string>  $saved
     * @param  array<string, ProfileSkip>  $skipped
     */
    public function __construct(
        public array $saved,
        public array $skipped,
    ) {}
}
