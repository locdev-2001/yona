<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserSession;
use Illuminate\Session\SessionManager;

// Thu hồi một phiên = hủy bản ghi phiên trên store đang dùng (database, redis…)
// + xoá dòng user_sessions. Điểm sửa duy nhất cho mọi lối thu hồi (Hồ sơ →
// Phiên đăng nhập, màn chạm trần phiên lúc đăng nhập) và cho trần số phiên.
class UserSessionRevoker
{
    public function __construct(private readonly SessionManager $sessions) {}

    public function revoke(UserSession $session): void
    {
        $this->sessions->driver()->getHandler()->destroy($session->client_id);
        $session->delete();
    }

    public function revokeAll(User $user): void
    {
        $user->userSessions()->get()->each(fn (UserSession $session) => $this->revoke($session));
    }

    public function limitReached(User $user): bool
    {
        return $user->userSessions()->count() >= (int) config('yona.max_user_sessions');
    }

    // Lối đăng nhập đã xác minh mạnh (qua 2FA, qua nhà cung cấp OAuth) không hỏi
    // lại người dùng chọn phiên: chạm trần thì tự bỏ phiên cũ nhất.
    public function makeRoomFor(User $user): void
    {
        if ($this->limitReached($user)) {
            $this->revokeOldest($user);
        }
    }

    // Bỏ phiên có hoạt động gần nhất cũ nhất.
    public function revokeOldest(User $user): void
    {
        $oldest = $user->userSessions()
            ->orderByRaw('COALESCE(last_activity_at, created_at) ASC')
            ->first();

        if ($oldest) {
            $this->revoke($oldest);
        }
    }
}
