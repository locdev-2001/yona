<?php

namespace App\Agent\Evals;

// Kịch bản kết thúc thế nào.
enum Outcome: string
{
    case GoalMet = 'goal_met';
    case CustomerLeft = 'customer_left';
    case MaxTurns = 'max_turns';
    case HandedOff = 'handed_off';
    // AI tự tắt sau lượt lỗi (hết bước, mô hình lỗi…): lỗi hệ thống, không phải lựa chọn.
    case TurnFailed = 'turn_failed';
    // Bộ chấm hỏng giữa chừng (khách giả, giám khảo, hạ tầng): kết quả không dùng được.
    case EvalError = 'eval_error';

    public function label(): string
    {
        return match ($this) {
            self::GoalMet => 'khách đạt mục tiêu',
            self::CustomerLeft => 'khách bỏ đi',
            self::MaxTurns => 'hết lượt',
            self::HandedOff => 'AI chuyển người',
            self::TurnFailed => 'lượt AI lỗi',
            self::EvalError => 'lỗi bộ chấm',
        };
    }
}
