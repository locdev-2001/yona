<?php

namespace App\Agent\ValueObjects;

// Vì sao AI tự tắt trả lời tự động của hội thoại (ngoài bàn giao có chủ đích).
enum AutoReplyStop: string
{
    // Lượt lỗi: hội thoại chờ người trả lời.
    case TurnFailed = 'turn_failed';
    // AI agent tự dừng.
    case AgentStopped = 'agent_stopped';
}
