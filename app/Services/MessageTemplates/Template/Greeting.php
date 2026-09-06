<?php

namespace App\Services\MessageTemplates\Template;

// Port từ refs/chatwoot/app/services/message_templates/template/greeting.rb.
final class Greeting extends BaseTemplate
{
    protected function messages(): array
    {
        // Biến `{{contact.name}}` được thay ở Message::renderContentVariables().
        return [['content' => $this->conversation->inbox?->greeting_message]];
    }
}
