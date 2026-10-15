<?php

namespace App\Agent\ValueObjects;

// Ai đứng sau một tin lõi, suy từ trường máy chủ sở hữu (không từ nội dung).
enum MessageOrigin: string
{
    case Customer = 'customer';
    // Nhân viên người trong Yona (tin công khai hoặc ghi chú riêng).
    case Staff = 'staff';
    // Chủ shop trả lời thẳng trên ứng dụng của kênh.
    case ChannelEcho = 'channel_echo';
    case AiAgent = 'ai_agent';
    case Automation = 'automation';
    // Dòng hoạt động, tin mẫu của hệ thống.
    case System = 'system';
}
