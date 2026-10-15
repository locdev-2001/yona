<?php

namespace App\Services\Conversations;

// Vì sao hội thoại thôi tự động trả lời. Giá trị cũng là khoá dòng hoạt động.
enum AutoResponderStopReason: string
{
    // Nhân viên tự tắt công tắc.
    case Manual = 'manual';
    // Người trả lời công khai (trong Yona hoặc thẳng trên ứng dụng của kênh).
    case HumanJoined = 'human_joined';
    // AI agent chuyển hội thoại cho người.
    case HandedOff = 'handed_off';
    // AI agent tự dừng (hết ngân sách, công tắc dừng của nó).
    case AiAgentStopped = 'ai_agent_stopped';
}
