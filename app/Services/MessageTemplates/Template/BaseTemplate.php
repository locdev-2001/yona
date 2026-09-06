<?php

namespace App\Services\MessageTemplates\Template;

use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Port của `app/services/message_templates/template/*.rb`: mỗi lớp con chèn một
 * cụm tin `message_type = template` vào hội thoại.
 *
 * Bản gốc lặp lại nguyên khối `ActiveRecord::Base.transaction` + rescue +
 * `account_id/inbox_id/message_type` ở từng lớp; ở đây gom vào lớp cha để thêm
 * một mẫu tin mới chỉ còn là khai báo nội dung.
 */
abstract class BaseTemplate
{
    public function __construct(protected readonly Conversation $conversation) {}

    /**
     * Nội dung các tin sẽ chèn, theo đúng thứ tự hiển thị.
     *
     * @return list<array<string, mixed>>
     */
    abstract protected function messages(): array;

    public function perform(): void
    {
        try {
            DB::transaction(function (): void {
                foreach ($this->messages() as $attributes) {
                    $this->createTemplateMessage($attributes);
                }
            });
        } catch (Throwable $exception) {
            // rescue StandardError + ChatwootExceptionTracker: mẫu tin hỏng không
            // được làm hỏng lượt tạo tin của khách.
            report($exception);
        }
    }

    /** @param array<string, mixed> $attributes */
    private function createTemplateMessage(array $attributes): Message
    {
        return $this->conversation->messages()->create([
            'account_id' => $this->conversation->account_id,
            'inbox_id' => $this->conversation->inbox_id,
            'message_type' => Message::TYPE_TEMPLATE,
            ...$attributes,
        ]);
    }
}
