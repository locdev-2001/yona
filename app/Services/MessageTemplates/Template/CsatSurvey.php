<?php

namespace App\Services\MessageTemplates\Template;

use App\Models\Message;

// Port từ refs/chatwoot/app/services/message_templates/template/csat_survey.rb.
// Điểm gọi: CsatSurveyService khi hội thoại chuyển sang resolved — KHÔNG đi qua
// HookExecutionService như greeting/email-collect.
final class CsatSurvey extends BaseTemplate
{
    protected function messages(): array
    {
        $config = $this->conversation->inbox?->csat_config ?? [];

        return [[
            'content' => blank($config['message'] ?? null)
                ? __('conversations.templates.csat_input_message_body')
                : $config['message'],
            'content_type' => Message::CONTENT_TYPES['input_csat'],
            'content_attributes' => ['display_type' => $config['display_type'] ?? 'emoji'],
        ]];
    }
}
