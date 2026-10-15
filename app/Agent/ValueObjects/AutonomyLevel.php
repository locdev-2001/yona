<?php

namespace App\Agent\ValueObjects;

// Bậc tự chủ của AI agent. Mặc định AutoSafe: khẳng định ràng buộc chỉ gửi khi có nguồn
// trong lượt, không có thì giữ chân khách và hỏi ý kiến người.
enum AutonomyLevel: string
{
    // Dành cho trợ lý nội bộ về sau; chưa dùng.
    case Observe = 'observe';
    case AutoSafe = 'auto_safe';
    case Auto = 'auto';
}
