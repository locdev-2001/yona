<?php

namespace App\Agent\Contracts\Ports;

use App\Agent\ValueObjects\Product;

// Sản phẩm shop đã khai. Hiện thực đầu đọc thẻ sản phẩm lưu trong câu trả lời mẫu;
// danh mục sản phẩm thật thay hiện thực, giữ nguyên chữ ký.
interface ProductCatalog
{
    /**
     * $query null = liệt kê danh mục. Khớp không phân biệt dấu tiếng Việt.
     *
     * @return list<Product> xếp theo độ liên quan, tối đa $limit
     */
    public function search(int $accountId, ?string $query, int $limit): array;
}
