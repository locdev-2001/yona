<?php

namespace App\Services;

use App\Jobs\Conversations\ActivityMessageJob;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\MessageTemplates\Template\CsatSurvey;

/**
 * Điểm quyết định DUY NHẤT "có gửi khảo sát không" — listener chỉ gọi vào đây.
 * Hai nhánh mẫu WhatsApp/Twilio của bản gốc chưa port cùng kênh của chúng
 * (nhóm F); khi thêm kênh, thêm nhánh ở `perform()`, không rải điều kiện ra
 * ngoài.
 */
final class CsatSurveyService
{
    public function __construct(private readonly Conversation $conversation) {}

    public function perform(): void
    {
        if (! $this->shouldSendCsatSurvey()) {
            return;
        }

        if ($this->conversation->canReply()) {
            (new CsatSurvey($this->conversation))->perform();

            return;
        }

        $this->createCsatNotSentActivityMessage();
    }

    private function shouldSendCsatSurvey(): bool
    {
        return $this->conversation->isResolved()
            && $this->inbox()->csat_survey_enabled
            && ! $this->csatAlreadySent()
            && $this->csatAllowedBySurveyRules();
    }

    private function csatAlreadySent(): bool
    {
        return $this->conversation->messages()
            ->where('content_type', Message::CONTENT_TYPES['input_csat'])
            ->exists();
    }

    // csat_allowed_by_survey_rules?: chỉ chặn khi có luật VÀ luật có nhãn.
    private function csatAllowedBySurveyRules(): bool
    {
        $values = (array) data_get($this->csatConfig(), 'survey_rules.values', []);

        if ($values === []) {
            return true;
        }

        $labels = $this->conversation->labelList();

        return match (data_get($this->csatConfig(), 'survey_rules.operator') ?? 'contains') {
            'does_not_contain' => array_intersect($values, $labels) === [],
            'contains' => array_intersect($values, $labels) !== [],
            default => true,
        };
    }

    private function createCsatNotSentActivityMessage(): void
    {
        ActivityMessageJob::dispatch($this->conversation, $this->conversation->activityMessageParams(
            __('conversations.activity.csat.not_sent_due_to_messaging_window'),
        ));
    }

    /** @return array<string, mixed> */
    private function csatConfig(): array
    {
        return $this->inbox()->csat_config ?? [];
    }

    private function inbox(): Inbox
    {
        return $this->conversation->inbox;
    }
}
