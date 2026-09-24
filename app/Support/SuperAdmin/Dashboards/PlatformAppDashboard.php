<?php

namespace App\Support\SuperAdmin\Dashboards;

use App\Models\PlatformApp;
use App\Support\SuperAdmin\Dashboard;
use Illuminate\Database\Eloquent\Model;

class PlatformAppDashboard extends Dashboard
{
    public function modelClass(): string
    {
        return PlatformApp::class;
    }

    public function attributeTypes(): array
    {
        return [
            'access_token' => 'has_one',
            'id' => 'number',
            'name' => 'string',
            'created_at' => 'date_time',
            'updated_at' => 'date_time',
        ];
    }

    public function collectionAttributes(): array
    {
        return ['id', 'name'];
    }

    public function showPageAttributes(): array
    {
        return ['id', 'name', 'created_at', 'updated_at', 'access_token'];
    }

    public function formAttributes(): array
    {
        return ['name'];
    }

    public function displayResource(Model $record): string
    {
        return "PlatformApp #{$record->id}";
    }

    public function attributeValue(Model $record, string $attribute): mixed
    {
        return $attribute === 'access_token' ? $record->accessToken : parent::attributeValue($record, $attribute);
    }
}
