<?php

namespace App\Agent\Evals;

// Khách giả muốn gì sau câu trả lời vừa đọc.
enum CustomerIntent: string
{
    case Continue = 'continue';
    case GoalMet = 'goal_met';
    case GaveUp = 'gave_up';
}
