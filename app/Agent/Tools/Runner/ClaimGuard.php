<?php

namespace App\Agent\Tools\Runner;

use App\Agent\ValueObjects\ToolErrorCode;
use App\Agent\ValueObjects\ToolResult;
use App\Agent\ValueObjects\TurnEvidence;

// Dữ liệu doanh nghiệp là nguồn chuẩn, lời khách chỉ là lời khai: số tiền hay phần trăm
// trong câu gửi khách phải xuất hiện trong tool_result của chính lượt này hoặc trong
// lời nhân viên người đã nói công khai với khách. Tất định, không hỏi mô hình.
final class ClaimGuard
{
    public function check(string $customerFacingText, TurnEvidence $evidence): ?ToolResult
    {
        $claimed = MoneyMentions::in($customerFacingText);

        if ($claimed === []) {
            return null;
        }

        $sourced = MoneyMentions::in(implode("\n", $evidence->sources()), includeBareNumbers: true);
        $unsourced = array_values(array_diff($claimed, $sourced));

        if ($unsourced === []) {
            return null;
        }

        return ToolResult::failure(
            ToolErrorCode::UnsourcedClaim,
            'These amounts are not in any tool result of this turn or in what the staff told the customer: '.implode(', ', array_map(self::readable(...), $unsourced))
            .'. Do not state them. Look them up with search_knowledge, or, if the data has no answer, '
            .'use handoff_to_human with a short holding_reply that promises to check (no amounts).',
        );
    }

    private static function readable(string $key): string
    {
        [$unit, $value] = explode(':', $key, 2);

        return match ($unit) {
            'PCT' => $value.'%',
            default => $value.' '.$unit,
        };
    }
}
