<?php

namespace App\Policies;

use App\Models\AccountUser;

// Port từ refs/chatwoot/app/policies/portal_policy.rb — đọc: mọi thành viên;
// ghi: chỉ administrator.
final class PortalPolicy
{
    public function __construct(private readonly AccountUser $accountUser) {}

    public function index(): bool
    {
        return true;
    }

    public function show(): bool
    {
        return true;
    }

    public function create(): bool
    {
        return $this->accountUser->isAdministrator();
    }

    public function update(): bool
    {
        return $this->accountUser->isAdministrator();
    }

    public function edit(): bool
    {
        return $this->accountUser->isAdministrator();
    }

    public function destroy(): bool
    {
        return $this->accountUser->isAdministrator();
    }

    public function logo(): bool
    {
        return $this->accountUser->isAdministrator();
    }

    public function archive(): bool
    {
        return $this->accountUser->isAdministrator();
    }

    public function sendInstructions(): bool
    {
        return $this->accountUser->isAdministrator();
    }
}
