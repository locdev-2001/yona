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
    case WindowClosed = 'window_closed';
}
