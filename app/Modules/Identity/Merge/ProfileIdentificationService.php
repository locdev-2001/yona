<?php

namespace App\Modules\Identity\Merge;

use App\Models\Profile;
use App\Models\ProfileIdentity;
use App\Models\WorkspaceSequence;

/**
 * Nơi DUY NHẤT được ghi `profiles.is_identified`.
 *
 * Cột đó là cache suy ra từ bí danh, nên nó lệch được. Ba thứ giữ nó khỏi lệch:
 * chỉ một class ghi (class này), một lệnh đối soát chạy lại được, và test cho cả
 * ba đường bật/tắt/gộp. Bỏ điều kiện "chỉ một nơi ghi" là mất cả ba.
 *
 * Định nghĩa: đã định danh = có ÍT NHẤT MỘT bí danh loại `phone` hoặc `email`.
 * KHÔNG đòi `is_verified` — đã xác minh là mức tin cậy riêng, trộn vào đây thì
 * một khách có số chưa xác minh sẽ nằm mãi trong danh sách "chưa định danh".
 */
class ProfileIdentificationService
{
    /**
     * Tính lại cờ cho một hồ sơ, và cấp số hồ sơ nếu vừa được định danh.
     *
     * @return bool giá trị cờ sau khi tính lại
     */
    public function refresh(Profile $profile): bool
    {
        $identified = ProfileIdentity::query()
            ->where('profile_id', $profile->id)
            ->whereIn('key', ProfileIdentity::IDENTIFYING_KEYS)
            ->exists();

        // Số hồ sơ giống số căn cước: chỉ cấp khi đã định danh, và KHÔNG thu hồi
        // khi cờ tắt lại. Thu hồi rồi cấp lại là số nhảy loạn trong tài liệu đã in.
        if ($identified && $profile->profile_number === null) {
            $profile->profile_number = WorkspaceSequence::next('profile', $profile->workspace_id);
        }

        $profile->forceFill(['is_identified' => $identified])->save();

        return $identified;
    }

    /**
     * Đối soát toàn workspace — dùng cho lệnh chạy tay khi nghi cờ đã lệch.
     *
     * @return int số hồ sơ phải sửa
     */
    public function reconcileWorkspace(string $workspaceId): int
    {
        $fixed = 0;

        Profile::query()
            ->where('workspace_id', $workspaceId)
            ->chunkById(500, function ($profiles) use (&$fixed) {
                foreach ($profiles as $profile) {
                    $before = $profile->is_identified;

                    if ($this->refresh($profile) !== $before) {
                        $fixed++;
                    }
                }
            });

        return $fixed;
    }
}
