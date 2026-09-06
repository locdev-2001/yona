<?php

namespace App\Policies;

use App\Models\AccountUser;
use App\Models\Macro;

// Port từ refs/chatwoot/app/policies/macro_policy.rb.
// Macro global = tài sản của account (chỉ admin sửa/xóa); macro personal chỉ
// tác giả đụng tới được.
final class MacroPolicy
{
    public function __construct(private readonly AccountUser $accountUser) {}

    public function show(Macro $macro): bool
    {
        return $macro->isGlobal() || $this->isAuthor($macro);
    }

    public function update(Macro $macro): bool
    {
        return $macro->isGlobal() ? $this->accountUser->isAdministrator() : $this->isAuthor($macro);
    }

    public function destroy(Macro $macro): bool
    {
        return $this->update($macro);
    }

    public function execute(Macro $macro): bool
    {
        return $this->show($macro);
    }

    private function isAuthor(Macro $macro): bool
    {
        return $macro->created_by_id !== null && $macro->created_by_id === $this->accountUser->user_id;
    }
}
