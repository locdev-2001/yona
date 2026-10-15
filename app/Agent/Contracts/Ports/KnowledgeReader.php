<?php

namespace App\Agent\Contracts\Ports;

use App\Agent\ValueObjects\KnowledgeHit;

// Tra cứu tri thức của doanh nghiệp. Hiện thực đầu là Help Center + câu trả lời mẫu;
// kho tri thức đầy đủ thay hiện thực, giữ nguyên chữ ký.
interface KnowledgeReader
{
    /** @return list<KnowledgeHit> xếp theo độ liên quan, tối đa $limit */
    public function search(int $accountId, string $query, int $limit): array;
}
