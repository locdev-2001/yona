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

// Gửi nguyên thẻ sản phẩm shop đã khai (ảnh, giá, biến thể, nút đặt mua); mô hình chỉ
// chọn id, không bao giờ tự dựng giá hay nội dung thẻ. Thẻ đã có trong hội thoại thì không
// gửi lại: khách đã thấy, gửi lại chỉ làm loãng cuộc trò chuyện.
final class SendProductCardTool implements Tool
{
    public const NAME = 'send_product_card';

    private const MAX_PRODUCTS = 3;

    public function __construct(
        private readonly ConversationReader $reader,
        private readonly ConversationActionWriter $writer,
    ) {}

    public function spec(): ToolSpec
    {
        return new ToolSpec(
            self::NAME,
            'Show the customer the shop\'s own product card(s): photo, price, sizes/colours and an order button, exactly as the '
            .'shop made them. Use it when you suggest or the customer asks about specific products, 1 to '.self::MAX_PRODUCTS.' at a '
            .'time, with ids from search_products or search_knowledge. A card already shown in this conversation is not sent again: '
            .'talk about that product with reply. It does not end the turn: afterwards end it with one short reply that does not '
            .'repeat the card or its caption, or wait_for_customer.',
            [
                'type' => 'object',
                'properties' => [
                    'product_ids' => ['type' => 'array', 'minItems' => 1, 'maxItems' => self::MAX_PRODUCTS, 'uniqueItems' => true, 'items' => ['type' => 'string', 'minLength' => 1, 'maxLength' => 100], 'description' => 'Product ids, in the order to show.'],
                    'caption' => ['type' => 'string', 'minLength' => 1, 'maxLength' => 300, 'description' => 'Optional short line shown with the card(s).'],
                ],
                'required' => ['product_ids'],
                'additionalProperties' => false,
            ],
            ToolKind::Action,
        );
    }

    public function run(ToolCall $call, TurnContext $context): ToolResult
    {
        $requested = array_values(array_map('strval', (array) $call->args['product_ids']));
        $shown = $this->reader->shownProducts($context->conversation, $requested);
        $productIds = array_values(array_diff($requested, $shown));

        if ($productIds === []) {
            return ToolResult::failure(ToolErrorCode::Duplicate, 'Not sent: the customer has already seen these cards in this conversation. Talk about them with reply instead.');
        }

        $receipt = $this->writer->sendProductCards(
            $context->conversation,
            $context->aiAgentId,
            $productIds,
            isset($call->args['caption']) ? trim((string) $call->args['caption']) : null,
        );

        return DeliveryResult::of(
            $receipt,
            array_filter(['product_ids' => $productIds, 'already_shown_not_resent' => $shown]),
            'the customer now sees the card(s); end the turn with one short reply or wait_for_customer',
            notFoundFix: 'Not sent: at least one id is not a product of this shop. Use ids exactly as returned by search_products.',
        );
    }
}
