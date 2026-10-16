<?php

namespace App\Agent\Tools\Conversation;

use App\Agent\Contracts\Extensions\Tool;
use App\Agent\Contracts\Ports\ConversationActionWriter;
use App\Agent\ValueObjects\ToolCall;
use App\Agent\ValueObjects\ToolKind;
use App\Agent\ValueObjects\ToolResult;
use App\Agent\ValueObjects\ToolSpec;
use App\Agent\ValueObjects\TurnContext;

// Ghi chú riêng cho nhân viên trong hội thoại; khách không bao giờ thấy.
final class AddPrivateNoteTool implements Tool
{
    public const NAME = 'add_private_note';

    public function __construct(private readonly ConversationActionWriter $writer) {}

    public function spec(): ToolSpec
    {
        return new ToolSpec(
            self::NAME,
            'Leave a private note for the shop\'s staff in this conversation; the customer never sees it. Use it when the customer '
            .'confirms an order (products, size/colour, quantity, total, payment method, name, phone, delivery address) so the '
            .'staff can process and ship it, and for details save_customer_info could not store. Write it in the shop\'s '
            .'language. It does not end the turn and does not hand the conversation over.',
            [
                'type' => 'object',
                'properties' => [
                    'text' => ['type' => 'string', 'minLength' => 1, 'maxLength' => 2000, 'description' => 'The note.'],
                ],
                'required' => ['text'],
                'additionalProperties' => false,
            ],
            ToolKind::Action,
        );
    }

    public function run(ToolCall $call, TurnContext $context): ToolResult
    {
        $receipt = $this->writer->addNote($context->conversation, $context->aiAgentId, trim((string) $call->args['text']));

        return DeliveryResult::of($receipt, [], 'note saved for the staff');
    }
}
