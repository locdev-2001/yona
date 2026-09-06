<?php

namespace App\Policies;

use App\Models\AccountUser;

// Port từ refs/chatwoot/app/policies/custom_attribute_definition_policy.rb:
// đọc thì admin lẫn agent (tức mọi thành viên account), ghi thì chỉ admin.
final class CustomAttributeDefinitionPolicy
{
    public function __construct(private readonly AccountUser $accountUser) {}

    public function index(): bool
    {
        return true;
    }

    public function show(): bool
    {
        return $this->index();
    }

    public function store(): bool
    {
        return $this->accountUser->isAdministrator();
    }

    public function update(): bool
    {
        return $this->store();
    }

    public function destroy(): bool
    {
        return $this->store();
    }
}
