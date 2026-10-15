<?php

namespace App\Agent\ValueObjects;

// Ghi chú riêng cố định AI để lại cho nhân viên; chữ theo ngôn ngữ account do lõi dựng.
enum AgentNotice: string
{
    // Lượt không xong (mô hình lỗi, từ chối, vòng lặp chạm trần).
    case TurnFailed = 'turn_failed';
    // Cửa sổ trả lời của kênh đã đóng nên không gửi được.
    case WindowClosed = 'window_closed';
    // Account đã dùng hết ngân sách mô hình trong ngày.
    case BudgetExhausted = 'budget_exhausted';
}
