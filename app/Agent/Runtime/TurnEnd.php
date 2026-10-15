<?php

namespace App\Agent\Runtime;

// Kết cục của một lượt.
enum TurnEnd: string
{
    case Replied = 'replied';
    case HandedOff = 'handed_off';
    case Waited = 'waited';
    // Người tham gia, công tắc tắt, đổi người phụ trách, mất quyền nói: không gửi gì thêm.
    case Interrupted = 'interrupted';
    case FellBack = 'fell_back';
}
