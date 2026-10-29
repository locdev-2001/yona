<?php

namespace App\Services\Zalo;

use App\Jobs\Avatar\AvatarFromUrlJob;
use App\Models\Channel\Zalo;
use App\Services\Channels\InboxNaming;
use Illuminate\Support\Facades\Cache;

/**
 * Một chỗ DUY NHẤT ghi danh tính tài khoản Zalo (tên · SĐT · ảnh) vào kênh và hộp
 * thư. Hai đường đi tới đây:
 *  - quét QR xong (`QrLoginService::promote`) — dữ liệu tươi, được phép ghi đè;
 *  - nhịp tim `/health` của bridge (`ZaloHealthSweepJob`, và trang cấu hình gọi
 *    nhịp tim đó khi hồ sơ còn thiếu) — chỉ LẤP chỗ trống, không đụng thứ đã có.
 *
 * Ảnh đại diện luôn theo một luật chung: chỉ đặt khi hộp thư chưa có ảnh riêng,
 * để lần quét lại không đè ảnh chủ hộp thư tự chọn.
 */
class ZaloProfileSync
{
    public function __construct(private readonly InboxNaming $naming) {}

    private const AVATAR_MEMO_DAYS = 7;

    /** Hồ sơ còn thiếu thì mới đáng hỏi bridge — dùng chung cho nhịp tim và trang cấu hình. */
    public function isIncomplete(Zalo $channel): bool
    {
        return blank($channel->display_name) || $channel->inbox?->avatar === null;
    }

    /**
     * @param  array<string, mixed>  $profile  khoá `display_name`, `phone`, `avatar`
     * @return bool có gì thay đổi hay không
     */
    public function apply(Zalo $channel, array $profile, bool $authoritative): bool
    {
        $changes = array_filter([
            'display_name' => $this->pick($channel->display_name, $this->text($profile['display_name'] ?? null), $authoritative),
            'phone' => $this->pick($channel->phone, $this->text($profile['phone'] ?? null), $authoritative),
        ], fn ($value) => $value !== null);

        if ($changes !== []) {
            $previousName = $channel->display_name;
            $channel->update($changes);

            if (array_key_exists('display_name', $changes) && $channel->inbox !== null) {
                $this->naming->followAccount($channel->inbox->setRelation('channel', $channel), $previousName);
            }
        }

        $avatarChanged = $this->syncInboxAvatar($channel, $this->text($profile['avatar'] ?? null), $authoritative);

        return $changes !== [] || $avatarChanged;
    }

    /** Giá trị mới chỉ được ghi khi là nguồn chuẩn, hoặc khi chỗ cũ đang rỗng. */
    private function pick(?string $current, ?string $incoming, bool $authoritative): ?string
    {
        if ($incoming === null || $incoming === $current) {
            return null;
        }

        return $authoritative || blank($current) ? $incoming : null;
    }

    private function syncInboxAvatar(Zalo $channel, ?string $avatarUrl, bool $authoritative): bool
    {
        $inbox = $channel->inbox;

        if ($inbox === null || $avatarUrl === null || $inbox->avatar !== null) {
            return false;
        }

        // Nhịp tim chạy mỗi phút: nhớ ảnh đã thử để không đẩy lại job vô hạn, và
        // để chủ hộp thư xoá ảnh đi thì hệ thống KHÔNG tự đắp lại.
        $memoKey = self::avatarMemoKey($channel);

        if (! $authoritative && Cache::get($memoKey) === $avatarUrl) {
            return false;
        }

        Cache::put($memoKey, $avatarUrl, now()->addDays(self::AVATAR_MEMO_DAYS));
        AvatarFromUrlJob::dispatch($inbox, $avatarUrl);

        return true;
    }

    private static function avatarMemoKey(Zalo $channel): string
    {
        return "zalo:profile-avatar:{$channel->connectionId()}";
    }

    private function text(mixed $value): ?string
    {
        return is_string($value) && filled($value) ? $value : null;
    }
}
