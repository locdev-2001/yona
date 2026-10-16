<?php

namespace App\Agent\Tools\Conversation;

use App\Agent\Contracts\Extensions\Tool;
use App\Agent\Contracts\Ports\ConversationActionWriter;
use App\Agent\Contracts\Ports\ConversationReader;
use App\Agent\ValueObjects\ToolCall;
use App\Agent\ValueObjects\ToolErrorCode;
use App\Agent\ValueObjects\ToolKind;
use App\Agent\ValueObjects\ToolResult;
use App\Agent\ValueObjects\ToolSpec;
use App\Agent\ValueObjects\TurnContext;

// Gắn nhãn shop đã tạo vào hội thoại hiện tại; không tạo nhãn mới.
final class TagConversationTool implements Tool
{
    public const NAME = 'tag_conversation';

    private const MAX_LABELS = 3;

    // Đủ để mô hình chọn lại mà không làm phình kết quả khi shop có rất nhiều nhãn.
    private const MAX_LISTED_LABELS = 50;

    public function __construct(
        private readonly ConversationReader $reader,
        private readonly ConversationActionWriter $writer,
    ) {}

    public function spec(): ToolSpec
    {
        return new ToolSpec(
            self::NAME,
            'Add the shop\'s existing labels to this conversation so the staff can sort it, e.g. a label for a confirmed order or '
            .'for a customer waiting for a call back. Only labels the shop created can be used; a wrong name returns the list of '
            .'valid labels. It does not end the turn.',
            [
                'type' => 'object',
                'properties' => [
                    'labels' => ['type' => 'array', 'minItems' => 1, 'maxItems' => self::MAX_LABELS, 'uniqueItems' => true, 'items' => ['type' => 'string', 'minLength' => 1, 'maxLength' => 100], 'description' => 'Label names, as the shop wrote them.'],
                ],
                'required' => ['labels'],
                'additionalProperties' => false,
            ],
            ToolKind::Action,
        );
    }

    public function run(ToolCall $call, TurnContext $context): ToolResult
    {
        $available = $this->reader->labels($context->conversation->accountId);
        $byName = array_combine(array_map(fn (string $label) => mb_strtolower(trim($label)), $available), $available);
        $requested = array_map(fn (mixed $label) => trim((string) $label), (array) $call->args['labels']);
        $unknown = array_values(array_filter($requested, fn (string $label) => ! isset($byName[mb_strtolower($label)])));

        if ($available === []) {
            return ToolResult::failure(ToolErrorCode::UnknownRef, 'The shop has no labels; skip labelling.');
        }

        if ($unknown !== []) {
            $listed = implode(', ', array_slice($available, 0, self::MAX_LISTED_LABELS));

            return ToolResult::failure(ToolErrorCode::UnknownRef, 'Unknown label(s): '.implode(', ', $unknown).". Use only these: {$listed}.");
        }

        $current = $this->writer->addLabels($context->conversation, array_map(fn (string $label) => $byName[mb_strtolower($label)], $requested));

        if ($current === null) {
            return ToolResult::failure(ToolErrorCode::SourceUnavailable, 'The conversation could not be labelled; continue without it.');
        }

        return ToolResult::success(['labels' => $current]);
    }
}
