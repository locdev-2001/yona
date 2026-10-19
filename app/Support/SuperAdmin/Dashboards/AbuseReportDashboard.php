<?php

namespace App\Support\SuperAdmin\Dashboards;

use App\Models\AbuseReport;
use App\Support\SuperAdmin\Dashboard;
use Illuminate\Database\Eloquent\Model;

// Báo cáo vi phạm người dùng gửi lên; super admin xem và đổi trạng thái.
class AbuseReportDashboard extends Dashboard
{
    public const STATUS_NAMES = [
        AbuseReport::STATUS_OPEN => 'open',
        AbuseReport::STATUS_HANDLED => 'handled',
        AbuseReport::STATUS_DISMISSED => 'dismissed',
    ];

    public function modelClass(): string
    {
        return AbuseReport::class;
    }

    public function attributeTypes(): array
    {
        return [
            'id' => 'number',
            'reporter' => 'belongs_to',
            'reportable_type' => 'string',
            'reportable_id' => 'number',
            'reason' => 'string',
            'note' => 'string',
            'status' => 'select',
            'handled_at' => 'date_time',
            'created_at' => 'date_time',
        ];
    }

    public function collectionAttributes(): array
    {
        return ['id', 'reporter', 'reportable_type', 'reportable_id', 'reason', 'status', 'created_at'];
    }

    public function showPageAttributes(): array
    {
        return ['id', 'reporter', 'reportable_type', 'reportable_id', 'reason', 'note', 'status', 'handled_at', 'created_at'];
    }

    public function formAttributes(): array
    {
        return ['status'];
    }

    public function availableActions(): array
    {
        return ['index', 'show', 'edit'];
    }

    public function selectOptions(string $attribute): array
    {
        return $attribute === 'status' ? array_values(self::STATUS_NAMES) : [];
    }

    public function displayResource(Model $record): string
    {
        return "AbuseReport #{$record->getKey()}";
    }

    public function attributeValue(Model $record, string $attribute): mixed
    {
        return $attribute === 'status'
            ? self::STATUS_NAMES[$record->status] ?? (string) $record->status
            : parent::attributeValue($record, $attribute);
    }
}
