<?php

namespace App\Services\MessageTemplates\Template;

final class OutOfOffice extends BaseTemplate
{
    protected function messages(): array
    {
        // Biến `{{contact.name}}` được thay ở Message::renderContentVariables().
        return [['content' => $this->conversation->inbox?->out_of_office_message]];
    }
}
