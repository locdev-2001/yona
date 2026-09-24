<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\Auth;

// Người dùng đứng sau thay đổi, quyết định tên chủ thể trong activity message và người
// gửi tin nhắn. Ngoài request có auth sẵn, các job nền phải tự đặt giá trị này.
final class CurrentUser
{
    /**
     * Chạy $callback trong ngữ cảnh của $user rồi trả guard về trạng thái cũ.
     * Bắt buộc dùng trong job nền: worker chạy nhiều job tuần tự trên cùng tiến
     * trình, quên khôi phục là rò rỉ người dùng sang job kế.
     *
     * @template T
     *
     * @param  callable(): T  $callback
     * @return T
     */
    public static function runAs(?User $user, callable $callback): mixed
    {
        $previous = Auth::user();
        self::set($user);

        try {
            return $callback();
        } finally {
            self::set($previous);
        }
    }

    private static function set(mixed $user): void
    {
        $user === null ? Auth::guard()->forgetUser() : Auth::setUser($user);
    }
}
