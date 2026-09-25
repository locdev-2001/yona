<?php

namespace App\Support\SuperAdmin\Dashboards;

use App\Models\SuperAdminImpersonation;
use App\Support\SuperAdmin\Dashboard;
use Illuminate\Database\Eloquent\Model;

// Nhật ký đăng nhập hộ — chỉ đọc, không có new/edit/destroy.
class SuperAdminImpersonationDashboard extends Dashboard
{
    public function modelClass(): string
    {
        return SuperAdminImpersonation::class;
    }

    public function attributeTypes(): array
    {
        return [
            'superAdmin' => 'belongs_to',
            'targetUser' => 'belongs_to',
            'reason' => 'string',
            'ip_address' => 'string',
            'used_at' => 'date_time',
            'created_at' => 'date_time',
        ];
    }

    public function collectionAttributes(): array
    {
        return ['superAdmin', 'targetUser', 'created_at', 'used_at'];
    }

    public function showPageAttributes(): array
    {
        return ['superAdmin', 'targetUser', 'reason', 'ip_address', 'created_at', 'used_at'];
    }

    public function formAttributes(): array
    {
        return [];
    }

    public function availableActions(): array
    {
        return ['index', 'show'];
    }

    public function displayResource(Model $record): string
    {
        return "Impersonation #{$record->getKey()}";
    }
}
