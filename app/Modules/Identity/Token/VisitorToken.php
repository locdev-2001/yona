<?php

namespace App\Modules\Identity\Token;

/**
 * Phạm vi của một người dùng cuối: đúng một bí danh, trên đúng một tài khoản kênh.
 */
final readonly class VisitorToken
{
    public function __construct(
        public string $workspaceId,
        public string $channelAccountId,
        public string $identityId,
        public string $profileId,
        public int $expiresAt,
    ) {}
}
