<?php

namespace App\Support\SuperAdmin\Dashboards;

use App\Models\AgentBot;
use App\Support\SuperAdmin\Dashboard;
use Illuminate\Database\Eloquent\Model;

class AgentBotDashboard extends Dashboard
{
    public function modelClass(): string
    {
        return AgentBot::class;
    }

    public function attributeTypes(): array
    {
        return [
            'access_token' => 'has_one',
            'avatar_url' => 'avatar_field',
            'id' => 'number',
            'name' => 'string',
            'account' => 'belongs_to',
            'description' => 'string',
            'outgoing_url' => 'string',
            'created_at' => 'date_time',
            'updated_at' => 'date_time',
        ];
    }

    public function collectionAttributes(): array
    {
        return ['id', 'avatar_url', 'account', 'name', 'outgoing_url'];
    }

    public function showPageAttributes(): array
    {
        return ['id', 'avatar_url', 'account', 'name', 'description', 'outgoing_url', 'access_token'];
    }

    public function formAttributes(): array
    {
        return ['name', 'account', 'description', 'outgoing_url'];
    }

    public function validationRules(Model $record): array
    {
        return [
            'name' => ['nullable', 'string', 'max:255'],
            'account' => ['nullable', 'integer', 'exists:accounts,id'],
            'description' => ['nullable', 'string', 'max:255'],
            'outgoing_url' => ['nullable', 'url:http,https', 'max:255'],
        ];
    }

    public function displayResource(Model $record): string
    {
        return "AgentBot #{$record->id}";
    }

    public function attributeValue(Model $record, string $attribute): mixed
    {
        return match ($attribute) {
            'avatar_url' => $record->avatarUrl(),
            'access_token' => $record->accessToken,
            default => parent::attributeValue($record, $attribute),
        };
    }
}
