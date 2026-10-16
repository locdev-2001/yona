<?php

use App\Agent\Contracts\Ports\ConversationReader;
use App\Agent\ValueObjects\ConversationRef;
use App\Agent\ValueObjects\CoreMessage;
use App\Builders\Messages\MessageBuilder;
use App\Models\Conversation;
use Tests\Feature\Agent\Runtime\TurnKit;

// Tin có cấu trúc trong lịch sử phải tới mô hình thành chữ đọc được (giá, biến thể, số
// lượng, lựa chọn), không chỉ là "[sent: cards]".

beforeEach(fn () => TurnKit::boot());

/** @return list<CoreMessage> */
function readHistory(Conversation $conversation): array
{
    return app(ConversationReader::class)->messagesAfter(new ConversationRef($conversation->account_id, $conversation->id), null, 20);
}

it('renders cards, quick replies and the customer\'s order request as text with prices and choices', function () {
    ['conversation' => $conversation, 'staff' => $staff] = TurnKit::autoConversation();
    $conversation->account->update(['locale' => 'vi']);
    $card = (new MessageBuilder($staff, $conversation, [
        'content_type' => 'cards',
        'content_attributes' => ['items' => [[
            'id' => 'tee',
            'title' => 'Áo thun trắng',
            'price' => ['amount' => 150000, 'compare_at' => 180000],
            'variants' => [['name' => 'Size', 'options' => [['value' => 'M'], ['value' => 'L']]]],
            'actions' => [['kind' => 'order', 'label' => 'Đặt mua']],
        ]]],
    ]))->perform();
    (new MessageBuilder($staff, $conversation->fresh(), [
        'content_type' => 'input_select',
        'content' => 'Anh lấy size nào?',
        'content_attributes' => ['items' => [['title' => 'M'], ['title' => 'L']]],
    ]))->perform();
    (new MessageBuilder(null, $conversation->fresh(), [
        'message_type' => 'incoming',
        'content_type' => 'order_request',
        'content_attributes' => ['source_message_id' => $card->id, 'item_id' => 'tee', 'selections' => ['Size' => 'M'], 'quantity' => 2],
    ], incomingAllowed: true))->perform();

    $texts = array_map(fn (CoreMessage $message) => $message->text, readHistory($conversation));

    expect($texts)->toContain('• Áo thun trắng — 150.000đ (giá cũ 180.000đ, -17%)')
        ->and($texts)->toContain("Anh lấy size nào?\nNhắn số tương ứng để chọn:\n1. M\n2. L")
        ->and($texts)->toContain('Yêu cầu đặt hàng: Áo thun trắng · M × 2 = 300.000đ');
});

it('keeps plain text messages as they are', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    TurnKit::customerSays($conversation, 'Shop ơi');

    expect(array_map(fn (CoreMessage $message) => $message->text, readHistory($conversation)))->toContain('Shop ơi');
});
