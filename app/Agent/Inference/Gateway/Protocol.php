<?php

namespace App\Agent\Inference\Gateway;

// Giao thức wire của một nhà cung cấp. Thêm giao thức = thêm một driver.
enum Protocol: string
{
    case AnthropicMessages = 'anthropic_messages';
    case OpenAiChat = 'openai_chat';
}
