<?php

namespace App\Support\SuperAdmin\Dashboards;

use App\Models\SuperAdmin;
use App\Models\User;
use App\Support\SuperAdmin\Dashboard;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

// Port từ refs/chatwoot/app/dashboards/user_dashboard.rb.
class UserDashboard extends Dashboard
{
    public function modelClass(): string
    {
        return User::class;
    }

    public function attributeTypes(): array
    {
        return [
            'account_users' => 'has_many',
            'id' => 'number',
            'avatar_url' => 'avatar_field',
            'provider' => 'string',
            'uid' => 'string',
            'password' => 'password',
            'sign_in_count' => 'number',
            'current_sign_in_at' => 'date_time',
            'last_sign_in_at' => 'date_time',
            'current_sign_in_ip' => 'string',
            'last_sign_in_ip' => 'string',
            'confirmation_token' => 'string',
            'confirmed_at' => 'confirmed_at_field',
            'confirmation_sent_at' => 'date_time',
            'unconfirmed_email' => 'string',
            'name' => 'string',
            'display_name' => 'string',
            'email' => 'string',
            'created_at' => 'date_time',
            'updated_at' => 'date_time',
            'pubsub_token' => 'string',
            'type' => 'select',
            'accounts' => 'count_field',
            'access_token' => 'has_one',
        ];
    }

    public function collectionAttributes(): array
    {
        return ['id', 'avatar_url', 'name', 'email', 'accounts', 'type'];
    }

    public function showPageAttributes(): array
    {
        return ['id', 'avatar_url', 'name', 'type', 'display_name', 'email', 'unconfirmed_email',
            'created_at', 'updated_at', 'confirmed_at', 'account_users', 'access_token'];
    }

    public function formAttributes(): array
    {
        return ['name', 'display_name', 'email', 'password', 'confirmed_at', 'type'];
    }

    public function searchableAttributes(): array
    {
        return ['id', 'name', 'email'];
    }

    public function collectionFilters(): array
    {
        return [
            'super_admin' => fn (Builder $query) => $query->where('type', SuperAdmin::TYPE),
            'confirmed' => fn (Builder $query) => $query->whereNotNull('confirmed_at'),
            'unconfirmed' => fn (Builder $query) => $query->whereNull('confirmed_at'),
            'recent' => fn (Builder $query) => $query->where('created_at', '>', now()->subDays(30)),
        ];
    }

    public function selectOptions(string $attribute): array
    {
        return $attribute === 'type' ? ['', SuperAdmin::TYPE] : [];
    }

    public function displayResource(Model $record): string
    {
        return "#{$record->id} {$record->name}";
    }

    public function attributeValue(Model $record, string $attribute): mixed
    {
        return match ($attribute) {
            'avatar_url' => $record->avatarUrl(),
            'accounts' => $record->accountUsers()->count(),
            'account_users' => $record->accountUsers()->with(['account', 'user', 'inviter'])->get(),
            'access_token' => $record->accessToken,
            default => parent::attributeValue($record, $attribute),
        };
    }
}
