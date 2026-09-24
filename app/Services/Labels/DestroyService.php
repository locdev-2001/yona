<?php

namespace App\Services\Labels;

use App\Models\Conversation;

// Xóa dòng `labels` đã cascade sạch `taggings`, nên ở đây chỉ còn việc bản gốc
// làm bằng update_column: viết lại cached_label_list mà KHÔNG chạy hook/event.
// Bỏ: invalidate_filtered_unread_count_conversations (B8).
class DestroyService
{
    public function __construct(
        private readonly string $labelTitle,
        private readonly int $accountId,
    ) {}

    public function perform(): void
    {
        Conversation::query()
            ->where('account_id', $this->accountId)
            ->whereRaw("string_to_array(cached_label_list, ', ') @> ARRAY[?]::text[]", [$this->labelTitle])
            ->chunkById(1000, function ($conversations) {
                foreach ($conversations as $conversation) {
                    /** @var Conversation $conversation */
                    $conversation->newModelQuery()
                        ->whereKey($conversation->id)
                        ->toBase()
                        ->update(['cached_label_list' => implode(', ', $conversation->labelList())]);
                }
            });
    }
}
