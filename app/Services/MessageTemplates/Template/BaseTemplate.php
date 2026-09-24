<?php

namespace App\Services\MessageTemplates\Template;

use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Support\Facades\App;
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
                foreach ($this->localizedMessages() as $attributes) {
                    $this->createTemplateMessage($attributes);
                }
            });
        } catch (Throwable $exception) {
            // rescue StandardError + ExceptionTracker: mẫu tin hỏng không
            // được làm hỏng lượt tạo tin của khách.
            report($exception);
        }
    }

    /**
     * Tin mẫu được sinh ngoài request của người trực (khách nhắn vào widget, job
     * hàng đợi) nên locale của request KHÔNG nói lên ngôn ngữ người nhận. Chốt
     * theo ngôn ngữ của tài khoản, tại đúng một chỗ cho mọi mẫu tin.
     *
     * @return list<array<string, mixed>>
     */
    private function localizedMessages(): array
    {
        $accountLocale = $this->conversation->account?->locale;

        if (! is_string($accountLocale) || $accountLocale === '' || $accountLocale === App::getLocale()) {
            return $this->messages();
        }

        $previousLocale = App::getLocale();
        App::setLocale($accountLocale);

        try {
            return $this->messages();
        } finally {
            App::setLocale($previousLocale);
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
