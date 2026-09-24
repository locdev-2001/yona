<?php

namespace App\Services\OAuth;

// Người dùng mà nhà cung cấp OAuth vừa xác thực, đã quy về dạng chung cho lõi
// đăng nhập. Mỗi driver tự đọc `emailVerified` theo cách của nhà cung cấp đó.
final readonly class OAuthIdentity
{
    public function __construct(
        public string $email,
        public bool $emailVerified,
        public ?string $name,
    ) {}
}
