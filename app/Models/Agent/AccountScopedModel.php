<?php

namespace App\Models\Agent;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

// Lớp nền của mọi model bảng agent_*. Agent chạy ngoài request nên không có tenant
// ngầm: truy vấn đọc phải tự lọc account_id, thiếu thì ném lỗi thay vì trả dữ liệu
// của mọi account. Ghi qua model (save, delete, refresh) không đi qua phép kiểm này.
abstract class AccountScopedModel extends Model
{
    protected static function booted(): void
    {
        static::addGlobalScope('requiresAccountId', function (Builder $query): void {
            if (! self::filtersByAccount($query->getQuery()->wheres, $query->getModel()->getTable())) {
                throw MissingAccountScope::on($query->getModel()::class);
            }
        });
    }

    /** @param array<int, array<string, mixed>> $wheres */
    private static function filtersByAccount(array $wheres, string $table): bool
    {
        foreach ($wheres as $where) {
            $column = $where['column'] ?? null;

            if (! in_array($column, ['account_id', "{$table}.account_id"], true)) {
                continue;
            }

            $isEquality = $where['type'] === 'Basic' && ($where['operator'] ?? null) === '=';

            if ($isEquality || $where['type'] === 'In') {
                return true;
            }
        }

        return false;
    }
}
