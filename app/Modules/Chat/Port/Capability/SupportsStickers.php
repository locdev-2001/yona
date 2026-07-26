<?php

namespace App\Modules\Chat\Port\Capability;

use App\Models\Conversation;

/**
 * Kênh có kho sticker tìm kiếm được.
 */
interface SupportsStickers
{
    /**
     * @return list<array<string, mixed>> mỗi phần tử tối thiểu có id + url
     *
     * @throws \RuntimeException nền tảng từ chối
     */
    public function searchStickers(Conversation $conversation, string $keyword): array;
}
