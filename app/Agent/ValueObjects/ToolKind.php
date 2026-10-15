<?php

namespace App\Agent\ValueObjects;

enum ToolKind: string
{
    // Tra cứu: chạy rồi lặp tiếp vòng.
    case Read = 'read';
    // Kết thúc lượt: reply, consult_staff, handoff_to_human, wait_for_customer.
    case Terminal = 'terminal';
}
