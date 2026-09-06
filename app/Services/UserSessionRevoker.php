<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserSession;
use Illuminate\Support\Facades\DB;

// Chatwoot xoá token trong `users.tokens` để thu hồi một phiên; Yona dùng session
// của Laravel nên thu hồi = xoá bản ghi phiên ở store + dòng user_sessions.
// Điểm sửa duy nhất cho mọi lối thu hồi (profile, giới hạn phiên khi đăng nhập).
class UserSessionRevoker
{
    public function revoke(UserSession $session): void
    {
        $this->forgetStoredSession($session->client_id);
        $session->delete();
    }

    public function revokeAll(User $user): void
    {
        $user->userSessions()->get()->each(fn (UserSession $session) => $this->revoke($session));
    }

    // Bỏ phiên cũ nhất theo hoạt động gần nhất (Chatwoot: evict_oldest_session).
    public function revokeOldest(User $user): void
    {
        $oldest = $user->userSessions()
            ->orderByRaw('COALESCE(last_activity_at, created_at) ASC')
            ->first();

        if ($oldest) {
            $this->revoke($oldest);
        }
    }

    private function forgetStoredSession(string $clientId): void
    {
        if (config('session.driver') !== 'database') {
            return;
        }

        DB::connection(config('session.connection'))
            ->table(config('session.table', 'sessions'))
            ->where('id', $clientId)
            ->delete();
    }
}
