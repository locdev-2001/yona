<?php

namespace App\Agent\Evals;

// Ai nói một dòng trong bản ghi hội thoại eval. Khách giả chỉ thấy dòng công khai;
// giám khảo thấy cả ghi chú nội bộ và sự kiện.
enum Speaker: string
{
    case Customer = 'customer';
    case Ai = 'ai';
    case Staff = 'staff';
    // Ghi chú riêng AI để lại khi chuyển cho người.
    case AiHandoffNote = 'ai_handoff_note';
    // Ghi chú riêng khác của AI (lượt lỗi, cửa sổ đóng…).
    case AiNotice = 'ai_notice';
    case Event = 'event';

    public function isPublic(): bool
    {
        return in_array($this, [self::Customer, self::Ai, self::Staff], true);
    }

    public function judgeLabel(): string
    {
        return match ($this) {
            self::Customer => '[Khách]',
            self::Ai => '[AI trả lời khách]',
            self::Staff => '[Nhân viên người]',
            self::AiHandoffNote => '[Ghi chú nội bộ AI để lại cho nhân viên khi chuyển người]',
            self::AiNotice => '[Ghi chú nội bộ của hệ thống AI]',
            self::Event => '[Sự kiện]',
        };
    }
}
