<?php

namespace App\Support;

use App\Models\AssignmentPolicy;
use App\Models\Inbox;

// Port từ thuộc tính `Current.executed_by` của refs/chatwoot (CurrentAttributes):
// tác nhân không phải người dùng đang thực hiện thay đổi, dùng để đặt tên chủ
// thể trong activity message. CE chỉ set giá trị này ở AutoAssignment.
final class CurrentExecutedBy
{
    private static AssignmentPolicy|Inbox|null $actor = null;

    public static function get(): AssignmentPolicy|Inbox|null
    {
        return self::$actor;
    }

    public static function reset(): void
    {
        self::$actor = null;
    }

    /** @template T @param callable(): T $callback @return T */
    public static function run(AssignmentPolicy|Inbox|null $actor, callable $callback): mixed
    {
        self::$actor = $actor;

        try {
            return $callback();
        } finally {
            self::reset();
        }
    }
}
