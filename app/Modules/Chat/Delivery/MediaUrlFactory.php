<?php

namespace App\Modules\Chat\Delivery;

use App\Models\Attachment;

/**
 * Cổng dựng URL cho tệp đính kèm.
 *
 * Module không được gọi `route()` (§0.4 liệt kê đích danh), nên nó chỉ biết hai
 * thứ nó CẦN — một địa chỉ để nhà cung cấp tải tệp về, và một địa chỉ bền để
 * hiển thị trong dòng hội thoại. Chuyện ký, hạn dùng, tên route là việc của biên vào.
 */
interface MediaUrlFactory
{
    /**
     * Địa chỉ có chữ ký, hạn ngắn — dành cho nhà cung cấp tải tệp về.
     */
    public function signedFetchUrl(Attachment $attachment, string $workspaceId): string;

    /**
     * Địa chỉ bền để hiển thị — quyền xem bằng quyền xem hội thoại, không hết hạn.
     */
    public function displayUrl(Attachment $attachment): string;
}
