<?php

namespace App\Agent\ValueObjects;

enum ToolKind: string
{
    // Tra cứu: chạy rồi lặp tiếp vòng.
    case Read = 'read';
    // Hành động có tác dụng phụ (gửi thẻ cho khách, gắn nhãn, ghi chú, lưu hồ sơ) nhưng
    // không kết thúc lượt: qua cổng gửi trước khi chạy, mỗi bộ tham số chạy một lần mỗi lượt.
    case Action = 'action';
    // Kết thúc lượt: reply, handoff_to_human, wait_for_customer.
    case Terminal = 'terminal';
}
