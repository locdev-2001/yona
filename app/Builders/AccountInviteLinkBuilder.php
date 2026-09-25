<?php

namespace App\Builders;

use App\Models\Account;
use App\Models\AccountInviteLink;
use App\Models\AccountUser;
use App\Models\User;

// Tạo link mời — chỉ quản trị viên gọi được (kiểm ở controller). Không đụng
// usage_limits/agent seat vì gate hạn mức đã gỡ hoàn toàn (25/07/2026).
class AccountInviteLinkBuilder
{
    public function __construct(
        private readonly Account $account,
        private readonly User $creator,
        private readonly string $role,
        private readonly int $expiresInDays,
        private readonly ?int $maxUses = null,
    ) {}

    /** @return array{link: AccountInviteLink, token: string} */
    public function perform(): array
    {
        $token = AccountInviteLink::generateToken();

        $link = AccountInviteLink::create([
            'account_id' => $this->account->id,
            'created_by_id' => $this->creator->id,
            'role' => AccountUser::roleFromName($this->role),
            'token_digest' => AccountInviteLink::hashToken($token),
            'expires_at' => now()->addDays($this->expiresInDays),
            'max_uses' => $this->maxUses,
            'use_count' => 0,
        ]);

        return ['link' => $link, 'token' => $token];
    }
}
