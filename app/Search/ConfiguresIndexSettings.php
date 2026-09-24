<?php

namespace App\Search;

// Engine có chỉ mục riêng cần dựng sẵn cấu hình (trường tìm, lọc, xếp hạng)
// trước lần nạp tài liệu đầu tiên và sau mỗi lần đổi cấu hình.
interface ConfiguresIndexSettings
{
    public function syncIndexSettings(): void;
}
