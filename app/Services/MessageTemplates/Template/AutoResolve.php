<?php

namespace App\Services\MessageTemplates\Template;

use App\Jobs\Conversations\ActivityMessageJob;

/**
 * Điểm gọi: `Conversations\ResolutionJob` ngay trước khi đóng hội thoại nguội.
 * Ngoài cửa sổ được phép gửi tin thì ghi một dòng hoạt động thay vì tin nhắn —
 * cùng quy ước với `CsatSurveyService`.
 */
final class AutoResolve extends BaseTemplate
{
    public function perform(): void
    {
        if (blank($this->autoResolveMessage())) {
            return;
        }

        if ($this->conversation->canReply()) {
            parent::perform();

            return;
        }

        ActivityMessageJob::dispatch($this->conversation, $this->conversation->activityMessageParams(
            $this->conversation->inAccountLocale(fn () => __('conversations.activity.auto_resolve.not_sent_due_to_messaging_window')),
        ));
    }

    protected function messages(): array
    {
        return [['content' => $this->autoResolveMessage()]];
    }

    private function autoResolveMessage(): ?string
    {
        return $this->conversation->account->setting('auto_resolve_message');
    }
}
