<?php

namespace App\Agent\Tools\Conversation;

use App\Agent\Contracts\Extensions\Tool;
use App\Agent\Contracts\Ports\ConversationActionWriter;
use App\Agent\ValueObjects\ToolCall;
use App\Agent\ValueObjects\ToolKind;
use App\Agent\ValueObjects\ToolResult;
use App\Agent\ValueObjects\ToolSpec;
use App\Agent\ValueObjects\TurnContext;

// Câu hỏi kèm vài lựa chọn ngắn khách bấm (kênh không có nút thì khách trả lời bằng số).
final class SendQuickRepliesTool implements Tool
{
    public const NAME = 'send_quick_replies';

    private const MIN_OPTIONS = 2;

    private const MAX_OPTIONS = 5;

    public function __construct(private readonly ConversationActionWriter $writer) {}

    public function spec(): ToolSpec
    {
        return new ToolSpec(
            self::NAME,
            'Ask the customer a question with '.self::MIN_OPTIONS.' to '.self::MAX_OPTIONS.' short options to tap, e.g. which size, which '
            .'colour, COD or bank transfer. The question is sent with the options, so do not send the same question again with '
            .'reply: end the turn with wait_for_customer. Options must come from the shop\'s data (sizes and colours that are in stock).',
            [
                'type' => 'object',
                'properties' => [
                    'question' => ['type' => 'string', 'minLength' => 1, 'maxLength' => 500, 'description' => 'The question, written as the shop\'s staff member.'],
                    'options' => ['type' => 'array', 'minItems' => self::MIN_OPTIONS, 'maxItems' => self::MAX_OPTIONS, 'uniqueItems' => true, 'items' => ['type' => 'string', 'minLength' => 1, 'maxLength' => 40], 'description' => 'Short option labels.'],
                ],
                'required' => ['question', 'options'],
                'additionalProperties' => false,
            ],
            ToolKind::Action,
        );
    }

    public function run(ToolCall $call, TurnContext $context): ToolResult
    {
        $options = array_values(array_map(fn (mixed $option) => trim((string) $option), (array) $call->args['options']));
        $receipt = $this->writer->sendQuickReplies($context->conversation, $context->aiAgentId, trim((string) $call->args['question']), $options);

        return DeliveryResult::of($receipt, ['options' => $options], 'the customer now sees the question and options; end the turn with wait_for_customer');
    }
}
