<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * P10 — boot-guard 2-DB-role: runtime KHÔNG bao giờ được là superuser.
 * yona_app = RLS FORCE; yona_owner = BYPASSRLS nhưng NOSUPERUSER
 * (runbook docs/database-safety.md). Superuser bypass RLS toàn cluster →
 * cấu hình sai = tenant isolation chết im lặng.
 */
class DbRoleGuard
{
    /**
     * @return list<string> tên connection đang chạy bằng role superuser (rỗng = OK)
     */
    public static function superuserViolations(): array
    {
        $violations = [];

        foreach ([config('database.default'), 'pgsql_privileged'] as $connection) {
            try {
                $row = DB::connection($connection)
                    ->selectOne('SELECT rolsuper FROM pg_roles WHERE rolname = current_user');

                if ($row !== null && (bool) $row->rolsuper) {
                    $violations[] = (string) $connection;
                }
            } catch (\Throwable) {
                // DB chưa sẵn sàng lúc boot (artisan cache, CI...) — guard chỉ áp khi query được
            }
        }

        return $violations;
    }
}
