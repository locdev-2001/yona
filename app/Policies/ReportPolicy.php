<?php

namespace App\Policies;

use App\Models\AccountUser;

// Vai trò tùy biến
// (`report_manage`) là EE — CE chỉ quản trị viên xem được báo cáo.
final class ReportPolicy
{
    public function __construct(private readonly AccountUser $accountUser) {}

    public function view(): bool
    {
        return $this->accountUser->isAdministrator();
    }
}
