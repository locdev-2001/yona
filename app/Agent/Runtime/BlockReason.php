<?php

namespace App\Agent\Runtime;

// Vì sao SendGate không cho đi tiếp. Nhóm `interrupts` huỷ lượt, không gửi gì thêm.
enum BlockReason: string
{
    case KillSwitch = 'kill_switch';
    case ConversationGone = 'conversation_gone';
    case AutoReplyOff = 'auto_reply_off';
    case Reassigned = 'reassigned';
    case FloorLost = 'floor_lost';
    // Nhân viên người hoặc chủ shop (echo từ ứng dụng kênh) đã nói công khai.
    case HumanJoined = 'human_joined';
    case WindowClosed = 'window_closed';
    // Khách hoặc tin tự động vừa tới: đưa vào lượt và lập lại kế hoạch.
    case NewMessages = 'new_messages';

    public function interrupts(): bool
    {
        return ! in_array($this, [self::WindowClosed, self::NewMessages], true);
    }
}
