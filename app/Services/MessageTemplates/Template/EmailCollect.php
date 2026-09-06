<?php

namespace App\Services\MessageTemplates\Template;

use App\Models\Message;

// Port từ refs/chatwoot/app/services/message_templates/template/email_collect.rb:
// một tin giải thích + một ô nhập email (`input_email`) mà widget render thành form.
final class EmailCollect extends BaseTemplate
{
    protected function messages(): array
    {
        return [
            ['content' => __('conversations.templates.ways_to_reach_you_message_body')],
            [
                'content' => __('conversations.templates.email_input_box_message_body'),
                'content_type' => Message::CONTENT_TYPES['input_email'],
            ],
        ];
    }
}
