<?php

namespace App\Services\MessageTemplates;

use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\MessageTemplates\Template\EmailCollect;
use App\Services\MessageTemplates\Template\Greeting;

/**
 * Port từ refs/chatwoot/app/services/message_templates/hook_execution_service.rb.
 *
 * ĐIỂM GỌI DUY NHẤT của mọi mẫu tin tự động: `Message::created`. Thêm một mẫu
 * mới = thêm một nhánh ở `triggerTemplates()`, không rải điều kiện ra controller.
 *
 * Chưa port: OutOfOffice (cần Business Hours). CsatSurvey KHÔNG thuộc hook này —
 * bản gốc gọi nó từ CsatSurveyService lúc hội thoại được giải quyết.
 */
final class HookExecutionService
{
    /**
     * Chính các tin mẫu cũng chạy qua hook này. Bản gốc dùng `after_create_commit`
     * nên cả cụm tin đã nằm trong DB lúc hook chạy và mọi cổng dưới đây tự đóng;
     * `Model::created` của Laravel bắn ngay khi tin đầu vừa lưu, nên phải chặn
     * đệ quy tại đây thay vì dựa vào thời điểm commit.
     *
     * @var array<int, true> id hội thoại đang sinh tin mẫu
     */
    private static array $conversationsBeingTemplated = [];

    public function __construct(private readonly Message $message) {}

    public function perform(): void
    {
        $conversation = $this->conversation();

        if ($conversation === null || isset(self::$conversationsBeingTemplated[$conversation->id])) {
            return;
        }

        if ($this->lastIncomingMessageMissing() || $this->message->isAutoReplyEmail()) {
            return;
        }

        self::$conversationsBeingTemplated[$conversation->id] = true;

        try {
            $this->triggerTemplates();
        } finally {
            unset(self::$conversationsBeingTemplated[$conversation->id]);
        }
    }

    private function triggerTemplates(): void
    {
        if ($this->shouldSendGreeting()) {
            (new Greeting($this->conversation()))->perform();
        }

        if ($this->inbox()->enable_email_collect && $this->shouldSendEmailCollect()) {
            (new EmailCollect($this->conversation()))->perform();
        }
    }

    // Bỏ cổng `conversation.tweet?` của bản gốc: kênh Twitter chưa port.
    private function shouldSendGreeting(): bool
    {
        if ($this->conversation()->campaign_id !== null) {
            return false;
        }

        return $this->firstMessageFromContact()
            && $this->inbox()->greeting_enabled
            && filled($this->inbox()->greeting_message);
    }

    private function shouldSendEmailCollect(): bool
    {
        if ($this->conversation()->campaign_id !== null) {
            return false;
        }

        return blank($this->conversation()->contact?->email)
            && $this->inbox()->isWebWidget()
            && ! $this->emailCollectWasSent();
    }

    private function firstMessageFromContact(): bool
    {
        return ! $this->conversation()->messages()
            ->whereIn('message_type', [Message::TYPE_OUTGOING, Message::TYPE_TEMPLATE])
            ->exists();
    }

    private function emailCollectWasSent(): bool
    {
        return $this->conversation()->messages()
            ->where('content_type', Message::CONTENT_TYPES['input_email'])
            ->exists();
    }

    private function lastIncomingMessageMissing(): bool
    {
        return ! $this->conversation()->messages()
            ->where('account_id', $this->conversation()->account_id)
            ->incoming()
            ->exists();
    }

    private function conversation(): ?Conversation
    {
        return $this->message->conversation;
    }

    private function inbox(): Inbox
    {
        return $this->conversation()->inbox;
    }
}
