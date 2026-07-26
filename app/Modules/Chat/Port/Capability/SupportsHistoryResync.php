<?php

namespace App\Modules\Chat\Port\Capability;

/**
 * Kênh kéo lại được lịch sử đã bỏ lỡ.
 *
 * Nhận `$workspaceId` tường minh: driver bị cache suốt đời process nên không
 * được phụ thuộc ngữ cảnh ngầm của request.
 *
 * KHÔNG nhận số ngày lùi: mỗi nền tảng cho phép một mức khác nhau, nên đó là
 * hằng của kênh. Để lõi truyền vào là để lõi biết giá trị của một kênh cụ thể —
 * đúng thứ luật "lõi không biết tên kênh" cấm.
 */
interface SupportsHistoryResync
{
    /** @return int số tin kéo về được */
    public function resyncHistory(string $workspaceId): int;
}
