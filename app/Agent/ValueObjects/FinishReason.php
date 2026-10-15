<?php

namespace App\Agent\ValueObjects;

// Lý do mô hình dừng, đã chuẩn hoá qua mọi nhà cung cấp.
enum FinishReason: string
{
    case ToolUse = 'tool_use';
    case EndTurn = 'end_turn';
    case MaxOutput = 'max_output';
    case Refusal = 'refusal';
    case Empty = 'empty';
    case Error = 'error';
}
