<?php

namespace App\Agent\ValueObjects;

// Vai trong lịch sử gửi mô hình. Kết quả công cụ nằm trong tin `user` (driver tự đổi
// sang dạng của giao thức, vd tin role `tool` của OpenAI).
enum MessageRole: string
{
    case User = 'user';
    case Assistant = 'assistant';
}
