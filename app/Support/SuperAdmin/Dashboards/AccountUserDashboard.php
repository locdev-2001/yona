<?php

namespace App\Support\SuperAdmin\Dashboards;

use App\Models\AccountUser;
use App\Support\SuperAdmin\Dashboard;
use Illuminate\Database\Eloquent\Model;

// Port từ refs/chatwoot/app/dashboards/account_user_dashboard.rb.
class AccountUserDashboard extends Dashboard
{
    public function modelClass(): string
    {
        return AccountUser::class;
    }

    public function attributeTypes(): array
    {
        return [
            'account' => 'belongs_to_search',
            'user' => 'belongs_to_search',
            'inviter' => 'belongs_to_search',
            'id' => 'number',
            'role' => 'select',
            'created_at' => 'date_time',
            'updated_at' => 'date_time',
        ];
    }

    public function collectionAttributes(): array
    {
        return ['account', 'user', 'inviter', 'role'];
    }

    public function showPageAttributes(): array
    {
        return ['account', 'user', 'inviter', 'id', 'role', 'created_at', 'updated_at'];
    }

    public function formAttributes(): array
    {
        return ['account', 'user', 'role'];
    }

    public function selectOptions(string $attribute): array
    {
        return $attribute === 'role' ? array_values(AccountUser::ROLE_NAMES) : [];
    }

    public function displayResource(Model $record): string
    {
        return "AccountUser #{$record->id}";
    }

    public function attributeValue(Model $record, string $attribute): mixed
    {
        return match ($attribute) {
            'role' => AccountUser::ROLE_NAMES[$record->role] ?? null,
            default => parent::attributeValue($record, $attribute),
        };
    }
}
