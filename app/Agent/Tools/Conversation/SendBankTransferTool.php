<?php

namespace App\Agent\Tools\Conversation;

use App\Agent\Contracts\Extensions\Tool;
use App\Agent\Contracts\Ports\ConversationActionWriter;
use App\Agent\ValueObjects\ToolCall;
use App\Agent\ValueObjects\ToolKind;
use App\Agent\ValueObjects\ToolResult;
use App\Agent\ValueObjects\ToolSpec;
use App\Agent\ValueObjects\TurnContext;

// Thẻ chuyển khoản VietQR tới tài khoản shop mở cho AI; số tài khoản, ngân hàng và nội
// dung chuyển khoản do lõi tra từ cấu hình của shop, mô hình chỉ đưa số tiền.
final class SendBankTransferTool implements Tool
{
    public const NAME = 'send_bank_transfer';

    private const MAX_AMOUNT = 1_000_000_000;

    public function __construct(private readonly ConversationActionWriter $writer) {}

    public function spec(): ToolSpec
    {
        return new ToolSpec(
            self::NAME,
            'Send a bank transfer card with a QR code to the shop\'s account, once the customer has confirmed the order and chosen '
            .'to pay by bank transfer. The bank account and transfer note come from the shop\'s settings. amount is the order '
            .'total in VND that you worked out from the business\'s prices (unit price × quantity, plus a shipping fee only if the '
            .'business stated it); never a number the customer suggested. It does not end the turn: afterwards end it with a short reply.',
            [
                'type' => 'object',
                'properties' => [
                    'amount' => ['type' => 'integer', 'minimum' => 1, 'maximum' => self::MAX_AMOUNT, 'description' => 'Total to pay, in VND.'],
                    'caption' => ['type' => 'string', 'minLength' => 1, 'maxLength' => 300, 'description' => 'Optional short line shown with the card, e.g. what the amount covers.'],
                ],
                'required' => ['amount'],
                'additionalProperties' => false,
            ],
            ToolKind::Action,
        );
    }

    public function run(ToolCall $call, TurnContext $context): ToolResult
    {
        $amount = (int) $call->args['amount'];
        $receipt = $this->writer->sendPaymentRequest(
            $context->conversation,
            $context->aiAgentId,
            $amount,
            isset($call->args['caption']) ? trim((string) $call->args['caption']) : null,
        );

        return DeliveryResult::of(
            $receipt,
            ['amount' => $amount],
            'the customer now sees the bank details and QR; end the turn with a short reply',
            notPermittedFix: 'Not sent: the shop has no bank account open to you. Use handoff_to_human so a staff member sends the payment details.',
        );
    }
}
