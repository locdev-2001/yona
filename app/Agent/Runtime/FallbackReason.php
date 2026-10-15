<?php

namespace App\Agent\Runtime;

// Lý do lượt không kết thúc bằng công cụ kết thúc hợp lệ; Dispositions chọn đường lui.
enum FallbackReason: string
{
    case LoopCap = 'loop_cap';
    case TurnFailed = 'turn_failed';
    case ModelRefused = 'model_refused';
    // Mô hình chỉ trả chữ cả sau lời nhắc.
    case TextOnly = 'text_only';
    // Mô hình cứ khẳng định điều không có nguồn.
    case GuardFailed = 'guard_failed';
    case WindowClosed = 'window_closed';
}
