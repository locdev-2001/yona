<?php

namespace App\Support\SuperAdmin\Dashboards;

use App\Models\Account;
use App\Services\Admin\Operations\AccountActivity;
use App\Support\SuperAdmin\Dashboard;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class AccountDashboard extends Dashboard
{
    public function modelClass(): string
    {
        return Account::class;
    }

    public function attributeTypes(): array
    {
        return [
            'id' => 'number',
            'name' => 'string',
            'created_at' => 'date_time',
            'updated_at' => 'date_time',
            'users' => 'count_field',
            'conversations' => 'count_field',
            'locale' => 'select',
            'status' => 'account_status_field',
            'suspension_history' => 'suspension_history_field',
            'account_users' => 'has_many',
            'custom_attributes' => 'string',
            // Hai trường chỉ có trên biểu mẫu (bản gốc lấy từ params, không phải cột).
            'suspension_category' => 'select',
            'suspension_reason' => 'string',
            'inboxes' => 'count_field',
            AccountActivity::RECENT_MESSAGES_COUNT => 'count_field',
            AccountActivity::LAST_ACTIVITY_AT => 'date_time',
        ];
    }

    public function collectionAttributes(): array
    {
        return ['id', 'name', 'locale', 'users', 'conversations', 'status', 'inboxes', AccountActivity::RECENT_MESSAGES_COUNT, AccountActivity::LAST_ACTIVITY_AT];
    }

    public function showPageAttributes(): array
    {
        return ['id', 'name', 'created_at', 'updated_at', 'locale', 'status', 'suspension_history', 'conversations', 'account_users'];
    }

    public function formAttributes(): array
    {
        return ['name', 'locale', 'status', 'suspension_category', 'suspension_reason'];
    }

    // Hai trường lý do đình chỉ chỉ hiện khi chọn trạng thái `suspended`, đúng
    // như script `initializeAccountSuspensionForm` của bản gốc.
    public function formFieldDependency(string $attribute): ?array
    {
        return str_starts_with($attribute, 'suspension_')
            ? ['field' => 'status', 'value' => 'suspended']
            : null;
    }

    public function formFieldLabel(string $attribute): ?string
    {
        return match ($attribute) {
            'suspension_category' => __('super_admin.account_suspension.form.category'),
            'suspension_reason' => __('super_admin.account_suspension.form.reason'),
            default => null,
        };
    }

    public function searchableAttributes(): array
    {
        return ['id', 'name'];
    }

    public function collectionFilters(): array
    {
        return [
            'active' => fn (Builder $query) => $query->where('status', Account::STATUS_ACTIVE),
            'suspended' => fn (Builder $query) => $query->where('status', Account::STATUS_SUSPENDED),
            'recent' => fn (Builder $query) => $query->where('created_at', '>', now()->subDays(30)),
            'marked_for_deletion' => fn (Builder $query) => $query->whereRaw("custom_attributes->>'marked_for_deletion_at' IS NOT NULL"),
            'churn_risk' => fn (Builder $query) => AccountActivity::whereChurnRisk($query),
        ];
    }

    // Cột đếm và hoạt động đi chung câu truy vấn trang, không đếm lại từng dòng.
    public function baseQuery(): Builder
    {
        return AccountActivity::withActivityColumns(parent::baseQuery()->withCount(['accountUsers', 'conversations']));
    }

    public function selectOptions(string $attribute): array
    {
        return match ($attribute) {
            'locale' => array_column(config('yona.available_locales'), 'iso_639_1_code'),
            'status' => ['active', 'suspended'],
            'suspension_category' => array_keys(__('super_admin.account_suspension.categories')),
            default => [],
        };
    }

    public function displayResource(Model $record): string
    {
        return "#{$record->id} {$record->name}";
    }

    public function attributeValue(Model $record, string $attribute): mixed
    {
        return match ($attribute) {
            'users' => $record->account_users_count ?? $record->accountUsers()->count(),
            'conversations' => $record->conversations_count ?? $record->conversations()->count(),
            'inboxes' => (int) $record->{AccountActivity::INBOXES_COUNT},
            AccountActivity::RECENT_MESSAGES_COUNT => (int) $record->{AccountActivity::RECENT_MESSAGES_COUNT},
            'status' => $record->status === Account::STATUS_SUSPENDED ? 'suspended' : 'active',
            'suspension_history' => $record->internal_attributes['suspensions'] ?? [],
            'account_users' => $record->accountUsers()->with(['account', 'user', 'inviter'])->get(),
            'suspension_category', 'suspension_reason' => $this->lastSuspension($record)[str_replace('suspension_', '', $attribute)] ?? null,
            'custom_attributes' => json_encode($record->custom_attributes ?: new \stdClass),
            default => parent::attributeValue($record, $attribute),
        };
    }

    private function lastSuspension(Model $record): array
    {
        $history = $record->internal_attributes['suspensions'] ?? [];

        return $history === [] ? [] : (array) end($history);
    }
}
