<?php

namespace App\Policies;

use App\Models\AccountUser;

// Chỉ `index` mở cho
// mọi thành viên, còn lại administrator.
final class ArticlePolicy
{
    public function __construct(private readonly AccountUser $accountUser) {}

    public function index(): bool
    {
        return true;
    }

    public function show(): bool
    {
        return $this->accountUser->isAdministrator();
    }

    public function create(): bool
    {
        return $this->accountUser->isAdministrator();
    }

    public function update(): bool
    {
        return $this->accountUser->isAdministrator();
    }

    public function destroy(): bool
    {
        return $this->accountUser->isAdministrator();
    }

    public function reorder(): bool
    {
        return $this->accountUser->isAdministrator();
    }
}
