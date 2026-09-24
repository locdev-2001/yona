<?php

namespace App\Support\SuperAdmin\Dashboards;

use App\Models\AccessToken;
use App\Support\SuperAdmin\Dashboard;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class AccessTokenDashboard extends Dashboard
{
    public function modelClass(): string
    {
        return AccessToken::class;
    }

    public function attributeTypes(): array
    {
        return [
            'owner' => 'polymorphic',
            'id' => 'number',
            'token' => 'secret_field',
            'created_at' => 'date_time',
            'updated_at' => 'date_time',
        ];
    }

    public function collectionAttributes(): array
    {
        return ['owner', 'id', 'token', 'created_at'];
    }

    public function showPageAttributes(): array
    {
        return ['token'];
    }

    public function formAttributes(): array
    {
        return [];
    }

    public function availableActions(): array
    {
        return ['index', 'show'];
    }

    public function collectionFilters(): array
    {
        return [
            'user' => fn (Builder $query) => $query->where('owner_type', 'User'),
            'agent_bot' => fn (Builder $query) => $query->where('owner_type', 'AgentBot'),
            'platform_app' => fn (Builder $query) => $query->where('owner_type', 'PlatformApp'),
        ];
    }

    public function displayResource(Model $record): string
    {
        return "AccessToken #{$record->id}";
    }
}
