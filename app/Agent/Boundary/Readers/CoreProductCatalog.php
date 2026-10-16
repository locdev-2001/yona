<?php

namespace App\Agent\Boundary\Readers;

use App\Agent\Boundary\CoreProducts;
use App\Agent\Contracts\Ports\ProductCatalog;

// Danh mục bản mỏng: thẻ sản phẩm shop đã lưu trong câu trả lời mẫu của account.
final class CoreProductCatalog implements ProductCatalog
{
    public function search(int $accountId, ?string $query, int $limit): array
    {
        if ($limit <= 0) {
            return [];
        }

        $ranked = array_slice(CoreProducts::rank(CoreProducts::items($accountId), $query), 0, $limit);

        return array_map(fn (array $entry) => CoreProducts::product($entry['source'], $entry['item']), $ranked);
    }
}
