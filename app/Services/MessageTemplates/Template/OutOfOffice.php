<?php

namespace App\Services\MessageTemplates\Template;

// Port từ refs/chatwoot/app/services/message_templates/template/out_of_office.rb.
final class OutOfOffice extends BaseTemplate
{
    protected function messages(): array
    {
        // Biến `{{contact.name}}` được thay ở Message::renderContentVariables().
        return [['content' => $this->conversation->inbox?->out_of_office_message]];
    }
}
