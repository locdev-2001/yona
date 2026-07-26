<?php

namespace App\Modules\Identity\Contracts;

use App\Modules\Identity\Data\ObservedIdentity;
use App\Modules\Identity\Data\ResolvedIdentity;

/**
 * Cổng trung tính vào tầng định danh.
 *
 * Chat gọi cái này để lấy `profile_id`, và KHÔNG gọi `ContactService` hay đụng
 * `Contact`/`Lead`. Định danh nằm DƯỚI cả Chat lẫn CRM — cùng mức với workspace,
 * không phải "bảng của CDP mà Chat mượn".
 *
 * `observe()` chạy ĐỒNG BỘ tại thời điểm ghi tin, vì giao diện cần hiện đúng tên
 * ngay. Làm giàu (SĐT từ danh thiếp → gộp hồ sơ) vẫn đi bất đồng bộ qua sự kiện.
 */
interface IdentityResolver
{
    /**
     * Tra một bí danh đã biết. Không tạo mới.
     */
    public function resolve(string $workspaceId, string $key, string $value, ?string $channelAccountId = null): ?ResolvedIdentity;

    /**
     * Ghi nhận một lần nhìn thấy: chưa có thì tạo hồ sơ + bí danh, có rồi thì
     * làm mới những gì vừa biết thêm.
     */
    public function observe(ObservedIdentity $observation): ResolvedIdentity;

    /**
     * Ghi nhận một bí danh mà ta BIẾT là của hồ sơ nào.
     *
     * Đây là đường học thêm: đang nhắn với một uid, rồi khách gửi danh thiếp kèm
     * số điện thoại. Nếu số đó đã thuộc hồ sơ khác thì hai hồ sơ được GỘP — đó
     * chính là quy tắc "một số điện thoại là một người".
     */
    public function link(string $profileId, ObservedIdentity $observation): ResolvedIdentity;
}
