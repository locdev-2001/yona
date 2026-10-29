<?php

namespace App\Services\MessengerPersonal;

use App\Jobs\Avatar\AvatarFromUrlJob;
use App\Models\Channel\MessengerPersonal;
use App\Services\Channels\InboxNaming;

/**
 * Tên và ảnh tài khoản Facebook từ sidecar (lúc đăng nhập xong và mỗi lần phiên nối lại)
 * đi vào kênh và hộp thư. Ảnh chỉ đặt khi hộp thư chưa có ảnh, không đè ảnh chủ hộp thư tự chọn.
 */
class ProfileSync
{
    public function __construct(private readonly InboxNaming $naming) {}

    /** @param array<string, mixed> $account */
    public function apply(MessengerPersonal $channel, array $account): void
    {
        $displayName = $account['display_name'] ?? null;
        $inbox = $channel->inbox;

        if (is_string($displayName) && filled($displayName) && $displayName !== $channel->display_name) {
            $previousName = $channel->display_name;
            $channel->update(['display_name' => $displayName]);

            if ($inbox !== null) {
                $this->naming->followAccount($inbox->setRelation('channel', $channel), $previousName);
            }
        }

        $avatarUrl = $account['avatar_url'] ?? null;

        if ($inbox === null || ! is_string($avatarUrl) || blank($avatarUrl) || $inbox->avatar !== null) {
            return;
        }

        AvatarFromUrlJob::dispatch($inbox, $avatarUrl);
    }
}
