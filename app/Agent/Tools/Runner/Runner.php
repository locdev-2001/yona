<?php

namespace App\Agent\Tools\Runner;

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
    public function __construct(
        private readonly Registry $registry,
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
    public function validate(ToolCall $call, TurnEvidence $evidence): ?ToolResult
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

        return $call->name === Registry::REPLY ? $this->unknownSource($call, $evidence) : null;
    }

    public function runRead(ToolCall $call, TurnContext $context): ToolResult
    {
        $tool = $this->registry->readTool($call->name);

        if ($tool === null) {
            return ToolResult::failure(ToolErrorCode::InvalidArgs, "`{$call->name}` is not a lookup tool.");
        }

        try {
            return $tool->run($call, $context);
        } catch (Throwable $exception) {
            $this->logger->warning('agent.tool.failed', ['tool' => $call->name, 'exception' => $exception::class]);

            return ToolResult::failure(ToolErrorCode::SourceUnavailable, 'This lookup failed; do not guess, use handoff_to_human for binding claims.', retryable: true);
        }
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
