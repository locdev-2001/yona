<?php

namespace App\Agent\ValueObjects;

enum StimulusDecisionKind: string
{
    // Bỏ qua im lặng (công tắc tắt, công tắc dừng, hết ngân sách…).
    case Ignore = 'ignore';
    // Không nhận việc vì ngoài phạm vi (hội thoại nhóm, inbox không phụ trách…).
    case Decline = 'decline';
    // AI agent trả lời.
    case Respond = 'respond';
}
