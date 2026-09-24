<?php

namespace App\Support\SuperAdmin\Dashboards;

use App\Models\InstallationConfig;
use App\Support\SuperAdmin\Dashboard;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

// Scoped_resource của controller chỉ lấy bản ghi chưa khoá.
class InstallationConfigDashboard extends Dashboard
{
    public function modelClass(): string
    {
        return InstallationConfig::class;
    }

    public function attributeTypes(): array
    {
        return [
            'id' => 'number',
            'name' => 'string',
            'value' => 'serialized_field',
            'created_at' => 'date_time',
            'updated_at' => 'date_time',
        ];
    }

    public function collectionAttributes(): array
    {
        return ['id', 'name', 'value', 'created_at'];
    }

    public function showPageAttributes(): array
    {
        return ['id', 'name', 'value', 'created_at', 'updated_at'];
    }

    public function formAttributes(): array
    {
        return ['name', 'value'];
    }

    public function availableActions(): array
    {
        return ['index', 'show', 'new', 'edit'];
    }

    public function baseQuery(): Builder
    {
        return InstallationConfig::query()->editable();
    }

    public function displayResource(Model $record): string
    {
        return "InstallationConfig #{$record->id}";
    }

    public function attributeValue(Model $record, string $attribute): mixed
    {
        return $attribute === 'value'
            ? (is_scalar($record->value) || $record->value === null ? $record->value : json_encode($record->value))
            : parent::attributeValue($record, $attribute);
    }
}
