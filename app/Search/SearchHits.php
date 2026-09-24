<?php

namespace App\Search;

/**
 * Kết quả engine: id đã xếp hạng của một trang, tổng ước lượng (null khi engine
 * không đếm) và chú thích engine gắn cho từng id để giao diện biết vì sao dòng đó
 * khớp. Đây chỉ là gợi ý — SearchService nạp lại và lọc quyền trước khi trả ra.
 */
final readonly class SearchHits
{
    // Tên thành viên nhóm khớp gần nhất của một hội thoại nhóm.
    public const MATCHED_MEMBER_NAME = 'matched_member_name';

    /**
     * @param  list<int>  $ids
     * @param  array<int, array<string, mixed>>  $annotations
     */
    public function __construct(
        public array $ids,
        public ?int $estimatedTotal = null,
        public array $annotations = [],
    ) {}

    public static function none(): self
    {
        return new self([], 0);
    }

    public function annotation(int $id, string $key): mixed
    {
        return $this->annotations[$id][$key] ?? null;
    }
}
