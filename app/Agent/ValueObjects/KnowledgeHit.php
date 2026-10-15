<?php

namespace App\Agent\ValueObjects;

use InvalidArgumentException;

// Một kết quả tra cứu tri thức. Hình dạng giữ nguyên khi kho tri thức đầy đủ thay phần ruột.
final readonly class KnowledgeHit
{
    public function __construct(
        // Tham chiếu ổn định để trích nguồn (vd `article:12`, `canned_response:3`, sau này `fact:…`).
        public string $ref,
        // Loại nguồn: article, canned_response; về sau fact, chunk.
        public string $kind,
        public string $title,
        public string $excerpt,
        public Provenance $provenance,
    ) {
        if ($ref === '' || $kind === '') {
            throw new InvalidArgumentException('Knowledge hit needs a reference and a kind.');
        }
    }
}
