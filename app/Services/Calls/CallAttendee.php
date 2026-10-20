<?php

namespace App\Services\Calls;

use App\Models\User;

// Người xin vào phòng: người dùng Yona, hoặc khách không tài khoản chỉ có tên.
final readonly class CallAttendee
{
    private function __construct(
        public ParticipantIdentity $identity,
        public string $displayName,
        public ?User $user,
    ) {}

    public static function user(User $user): self
    {
        return new self(ParticipantIdentity::forUser($user->id), $user->availableName(), $user);
    }

    public static function guest(string $key, string $displayName): self
    {
        return new self(ParticipantIdentity::forGuest($key), $displayName, null);
    }
}
