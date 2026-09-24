<?php

namespace App\Services\MessageTemplates\Template;

final class Greeting extends BaseTemplate
{
    protected function messages(): array
    {
        // Biến `{{contact.name}}` được thay ở Message::renderContentVariables().
        return [['content' => $this->conversation->inbox?->greeting_message]];
    }
}
