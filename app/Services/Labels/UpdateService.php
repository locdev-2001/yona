<?php

namespace App\Services\Labels;

use App\Models\Conversation;
use App\Models\Label;

// Port từ refs/chatwoot/app/services/labels/update_service.rb.
// Bản gốc phải viết lại từng tag trên conversation lẫn contact vì tag là bản ghi
// riêng; ở đây đổi tên nhãn là đổi đúng một dòng `labels`, việc còn lại chỉ là
// làm mới cache `cached_label_list` của hội thoại (contact không có cache).
// Bỏ tham số old_label_title vì taggings trỏ thẳng vào nhãn, không tra theo tên.
class UpdateService
{
    public function __construct(
        private readonly string $newLabelTitle,
        private readonly int $accountId,
    ) {}

    public function perform(): void
    {
        $label = Label::query()
            ->where('account_id', $this->accountId)
            ->where('title', Label::normalizeTitle($this->newLabelTitle))
            ->first();

        if ($label === null) {
            return;
        }

        $label->conversations()
            ->select('conversations.*')
            ->orderBy('conversations.id')
            ->chunk(1000, function ($conversations) {
                foreach ($conversations as $conversation) {
                    /** @var Conversation $conversation */
                    $conversation->refreshCachedLabelList();
                }
            });
    }
}
