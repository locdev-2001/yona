<?php

namespace App\Agent\Tools\Runner;

use App\Agent\Contracts\Ports\ConversationReader;
use App\Agent\ValueObjects\ConversationRef;
use App\Agent\ValueObjects\ToolCall;
use App\Agent\ValueObjects\ToolErrorCode;
use App\Agent\ValueObjects\ToolKind;
use App\Agent\ValueObjects\ToolResult;
use App\Agent\ValueObjects\TurnContext;
use App\Agent\ValueObjects\TurnEvidence;
use Psr\Log\LoggerInterface;
use Throwable;

// Kiểm và chạy lời gọi công cụ. Sai thì trả tool_result lỗi kèm hướng sửa để mô hình tự
// chữa ở bước sau; không bao giờ ném ngoại lệ ra vòng lặp.
final class Runner
{
    // Ngắn hơn chừng này thì không coi là số tài khoản (tránh trùng giá tiền, số lượng).
    private const MIN_GUARDED_ACCOUNT_DIGITS = 6;

    public function __construct(
        private readonly Registry $registry,
        private readonly ConversationReader $conversations,
        private readonly LoggerInterface $logger,
    ) {}

    public function registry(): Registry
    {
        return $this->registry;
    }

    public function kindOf(string $name): ?ToolKind
    {
        return $this->registry->spec($name)?->kind;
    }

    // null = lời gọi hợp lệ; ngược lại là kết quả lỗi gửi lại mô hình.
    public function validate(ToolCall $call, TurnEvidence $evidence, ConversationRef $conversation): ?ToolResult
    {
        $spec = $this->registry->spec($call->name);

        if ($spec === null) {
            $available = implode(', ', array_map(fn ($known) => $known->name, $this->registry->specs()));

            return ToolResult::failure(ToolErrorCode::InvalidArgs, "Unknown tool `{$call->name}`. Use one of: {$available}.");
        }

        $violation = ArgumentCheck::violation($spec->inputSchema, $call->args);

        if ($violation !== null) {
            return ToolResult::failure(ToolErrorCode::InvalidArgs, "{$violation} Fix the arguments and call `{$call->name}` again.");
        }

        return ($call->name === Registry::REPLY ? $this->unknownSource($call, $evidence) : null)
            ?? $this->typedPaymentNumber($call, $conversation);
    }

    // Chạy phần thân của công cụ đọc hoặc hành động; lỗi bất ngờ thành tool_result lỗi.
    public function run(ToolCall $call, TurnContext $context): ToolResult
    {
        $tool = $this->registry->tool($call->name);

        if ($tool === null) {
            return ToolResult::failure(ToolErrorCode::InvalidArgs, "`{$call->name}` ends the turn and must be called on its own.");
        }

        try {
            return $tool->run($call, $context);
        } catch (Throwable $exception) {
            $this->logger->warning('agent.tool.failed', ['tool' => $call->name, 'exception' => $exception::class]);

            return $tool->spec()->kind === ToolKind::Action
                ? ToolResult::failure(ToolErrorCode::SourceUnavailable, 'This action failed and nothing was done; do not claim it was done. Continue without it or use handoff_to_human.')
                : ToolResult::failure(ToolErrorCode::SourceUnavailable, 'This lookup failed; do not guess, use handoff_to_human for binding claims.', retryable: true);
        }
    }

    // Số tài khoản của shop tới khách bằng thẻ chuyển khoản (QR, số tiền, nội dung đúng mẫu),
    // không gõ tay ra chữ; thẻ đã gửi trong hội thoại rồi thì nhắc lại bằng chữ được. So theo
    // chữ số sau khi bỏ khoảng trắng, dấu chấm, dấu gạch.
    private function typedPaymentNumber(ToolCall $call, ConversationRef $conversation): ?ToolResult
    {
        $argument = Registry::CUSTOMER_TEXT_ARGUMENTS[$call->name] ?? null;
        $text = $argument === null ? '' : (string) ($call->args[$argument] ?? '');
        $compact = (string) preg_replace('/[\s.\-]+/u', '', $text);

        if (preg_match('/\d{'.self::MIN_GUARDED_ACCOUNT_DIGITS.',}/', $compact) !== 1) {
            return null;
        }

        foreach ($this->conversations->paymentNumbersRequiringCard($conversation) as $number) {
            if (strlen($number) >= self::MIN_GUARDED_ACCOUNT_DIGITS && str_contains($compact, $number)) {
                return ToolResult::failure(ToolErrorCode::NotAllowedThisTurn, "Not sent: do not type the shop's bank account number. Call send_bank_transfer first (the card shows the bank, account, amount, transfer note and QR), then call `{$call->name}` again without the account number.");
            }
        }

        return null;
    }

    private function unknownSource(ToolCall $call, TurnEvidence $evidence): ?ToolResult
    {
        foreach ((array) ($call->args['sources'] ?? []) as $source) {
            if (! $evidence->mentions('"'.$source.'"')) {
                return ToolResult::failure(ToolErrorCode::UnknownRef, "Source `{$source}` was not returned by any lookup in this turn. Cite only refs returned by search_knowledge in this turn, or pass an empty list.");
            }
        }

        return null;
    }
}
