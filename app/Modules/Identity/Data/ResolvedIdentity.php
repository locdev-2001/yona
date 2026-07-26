<?php

namespace App\Modules\Identity\Data;

/**
 * Kết quả tra: bí danh này thuộc hồ sơ nào.
 *
 * Trả cả hai id chứ không trả model: nơi gọi (Chat) chỉ cần ghi khóa xuống, và
 * không được phép đụng vào bảng của tầng định danh.
 */
final readonly class ResolvedIdentity
{
    public function __construct(
        public string $identityId,
        public string $profileId,
        public bool $isIdentified,
        public ?string $displayName = null,
        public ?string $avatarUrl = null,
    ) {}
}
