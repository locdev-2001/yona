<?php

use App\Agent\Runtime\TurnSettings;
use App\Agent\ValueObjects\ToolResultBlock;
use App\Models\Account;
use App\Models\CannedResponse;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\CustomAttributeDefinition;
use App\Models\Label;
use App\Models\Message;
use App\Models\Note;
use App\Models\PaymentAccount;
use App\Support\AnonymousName;
use Illuminate\Support\Facades\Http;
use Tests\Feature\Agent\Runtime\ScriptedLanguageModel as Model;
use Tests\Feature\Agent\Runtime\TurnKit;

// Bộ công cụ bán hàng chạy qua đúng vòng lượt thật: mô hình giả gọi công cụ, kết quả đọc
// lại từ request kế tiếp, tác dụng phụ kiểm thẳng trên dữ liệu lõi.

beforeEach(function () {
    TurnKit::boot();
    Http::preventStrayRequests();
});

/** @return array<string, mixed> kết quả công cụ thứ $index ở tin cuối của request */
function salesToolResult(Model $model, int $request, int $index = 0): array
{
    $messages = $model->requests[$request]->prompt->messages;
    $results = array_values(array_filter(end($messages)->content, fn ($block) => $block instanceof ToolResultBlock));

    return json_decode($results[$index]->content, true);
}

function teeCards(int $accountId): CannedResponse
{
    return TurnKit::productCards($accountId, 'ao-thun', [
        [
            'id' => 'tee-white',
            'title' => 'Áo thun trắng basic',
            'description' => 'Cotton 100%, form rộng.',
            'price' => ['amount' => 150000, 'compare_at' => 180000],
            'stock_label' => 'Còn hàng',
            'variants' => [['name' => 'Size', 'options' => [['value' => 'M'], ['value' => 'L'], ['value' => 'XL', 'disabled' => true]]]],
            'actions' => [['kind' => 'order', 'label' => 'Đặt mua']],
        ],
        ['id' => 'tee-black', 'title' => 'Áo thun đen', 'price' => ['amount' => 160000]],
    ]);
}

/** @return list<Message> */
function cardMessages(Conversation $conversation): array
{
    return array_values(array_filter(TurnKit::aiReplies($conversation), fn (Message $message) => $message->contentTypeName() === 'cards'));
}

it('finds products without accents and shows prices, sizes out of stock and the id to send', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    $cards = teeCards($conversation->account_id);
    teeCards(Account::factory()->create()->id);
    $model = TurnKit::model([
        Model::call('search_products', ['query' => 'ao thun trang']),
        Model::call('wait_for_customer', ['reason' => 'x']),
    ]);

    TurnKit::customerSays($conversation, 'Áo thun trắng còn không?');
    TurnKit::runPendingTurns();

    $found = salesToolResult($model, 1)['data'];

    expect($found)->toHaveCount(2)
        ->and($found[0])->toMatchArray([
            'id' => "{$cards->id}:tee-white",
            'source' => "canned_response:{$cards->id}",
            'title' => 'Áo thun trắng basic',
            'price' => 150000,
            'compare_at_price' => 180000,
            'stock' => 'Còn hàng',
            'orderable_in_card' => true,
        ])
        ->and($found[0]['variants'])->toBe([['name' => 'Size', 'offered' => ['M', 'L'], 'out_of_stock' => ['XL']]]);
});

it('sends the shop\'s own card, then a short reply citing the product source', function () {
    ['conversation' => $conversation, 'aiAgent' => $aiAgent] = TurnKit::autoConversation();
    $cards = teeCards($conversation->account_id);
    $model = TurnKit::model([
        Model::call('search_products', ['query' => 'áo thun trắng']),
        Model::call('send_product_card', ['product_ids' => ["{$cards->id}:tee-white"], 'caption' => 'Mẫu này nè anh']),
        Model::call('reply', ['text' => 'Dạ áo trắng 150.000đ, còn size M và L ạ.', 'sources' => ["canned_response:{$cards->id}"]]),
    ]);

    TurnKit::customerSays($conversation, 'Cho xem áo thun trắng');
    TurnKit::runPendingTurns();

    $sent = cardMessages($conversation);

    expect($sent)->toHaveCount(1)
        ->and($sent[0]->sender_id)->toBe($aiAgent->id)
        ->and($sent[0]->content)->toBe('Mẫu này nè anh')
        ->and($sent[0]->content_attributes['items'])->toBe([$cards->content_attributes['items'][0]])
        ->and(salesToolResult($model, 2))->toMatchArray(['ok' => true])
        ->and(array_map(fn (Message $message) => $message->content, TurnKit::aiReplies($conversation)))->toBe(['Mẫu này nè anh', 'Dạ áo trắng 150.000đ, còn size M và L ạ.']);
});

it('refuses product ids that are not this shop\'s and sends nothing', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    $foreign = teeCards(Account::factory()->create()->id);
    $model = TurnKit::model([
        Model::call('send_product_card', ['product_ids' => ["{$foreign->id}:tee-white"]]),
        Model::call('send_product_card', ['product_ids' => ['12345:made-up']]),
        Model::call('wait_for_customer', ['reason' => 'x']),
    ]);

    TurnKit::customerSays($conversation, 'Có áo không?');
    TurnKit::runPendingTurns();

    expect(salesToolResult($model, 1)['error']['code'])->toBe('unknown_ref')
        ->and(salesToolResult($model, 2)['error']['code'])->toBe('unknown_ref')
        ->and(TurnKit::aiReplies($conversation))->toBeEmpty();
});

it('does the same action only once per turn however often the model repeats it', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    $cards = teeCards($conversation->account_id);
    $send = ['product_ids' => ["{$cards->id}:tee-black"]];
    $model = TurnKit::model([
        Model::calls([['send_product_card', $send], ['send_product_card', $send]]),
        Model::call('wait_for_customer', ['reason' => 'x']),
    ]);

    TurnKit::customerSays($conversation, 'Áo đen?');
    TurnKit::runPendingTurns();

    expect(cardMessages($conversation))->toHaveCount(1)
        ->and(salesToolResult($model, 1, 1)['error']['code'])->toBe('duplicate');
});

it('does not send again a card the customer already saw in an earlier turn, and sends only the new ones', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    $cards = teeCards($conversation->account_id);
    $white = "{$cards->id}:tee-white";
    $black = "{$cards->id}:tee-black";
    $model = TurnKit::model([
        Model::call('send_product_card', ['product_ids' => [$white]]),
        Model::call('wait_for_customer', ['reason' => 'x']),
        Model::call('send_product_card', ['product_ids' => [$white]]),
        Model::call('send_product_card', ['product_ids' => [$white, $black]]),
        Model::call('wait_for_customer', ['reason' => 'x']),
    ]);

    TurnKit::customerSays($conversation, 'Áo trắng?');
    TurnKit::runPendingTurns();
    TurnKit::customerSays($conversation, 'Cho xem lại với mẫu đen');
    TurnKit::runPendingTurns();

    $sent = cardMessages($conversation);

    expect(salesToolResult($model, 3)['error']['code'])->toBe('duplicate')
        ->and(salesToolResult($model, 4)['data'])->toMatchArray(['product_ids' => [$black], 'already_shown_not_resent' => [$white]])
        ->and(array_map(fn (Message $message) => $message->content_attributes['items'][0]['id'], $sent))->toBe(['tee-white', 'tee-black']);
});

it('holds an action when the customer writes right before it, then does it after re-planning', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    $cards = teeCards($conversation->account_id);
    $model = TurnKit::model([
        function () use ($conversation, $cards) {
            TurnKit::customerSays($conversation, 'À lấy màu đen nha');

            return Model::call('send_product_card', ['product_ids' => ["{$cards->id}:tee-white"]]);
        },
        Model::call('send_product_card', ['product_ids' => ["{$cards->id}:tee-black"]]),
        Model::call('wait_for_customer', ['reason' => 'x']),
    ]);

    TurnKit::customerSays($conversation, 'Cho xem áo thun');
    TurnKit::runPendingTurns();

    $sent = cardMessages($conversation);

    expect(salesToolResult($model, 1)['error']['code'])->toBe('deferred')
        ->and(implode("\n", array_map(fn ($block) => $block->text ?? '', array_slice($model->requests[1]->prompt->messages, -1)[0]->content)))->toContain('À lấy màu đen nha')
        ->and($sent)->toHaveCount(1)
        ->and($sent[0]->content_attributes['items'][0]['id'])->toBe('tee-black');
});

it('does nothing more once the owner answers from the channel app mid-turn', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    $cards = teeCards($conversation->account_id);
    $model = TurnKit::model([
        function () use ($conversation, $cards) {
            TurnKit::ownerEchoes($conversation, 'Để chị tư vấn em nhé.');

            return Model::call('send_product_card', ['product_ids' => ["{$cards->id}:tee-white"]]);
        },
        Model::call('reply', ['text' => 'Không tới được đây.']),
    ]);

    TurnKit::customerSays($conversation, 'Áo trắng?');
    TurnKit::runPendingTurns();

    expect($model->requests)->toHaveCount(1)
        ->and(TurnKit::aiReplies($conversation))->toBeEmpty()
        ->and((bool) $conversation->fresh()->ai_auto_reply)->toBeFalse();
});

it('reports a card as not sent when the channel window closed, then falls back with a note', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    $cards = teeCards($conversation->account_id);
    $model = TurnKit::model([
        function () use ($conversation, $cards) {
            $conversation->inbox->channel->forceFill(['additional_attributes' => ['agent_reply_time_window' => 1]])->save();
            Message::query()->where('conversation_id', $conversation->id)->update(['created_at' => now()->subHours(2)]);

            return Model::call('send_product_card', ['product_ids' => ["{$cards->id}:tee-white"]]);
        },
    ]);

    TurnKit::customerSays($conversation, 'Áo trắng?');
    TurnKit::runPendingTurns();

    expect($model->requests)->toHaveCount(1)
        ->and(TurnKit::aiReplies($conversation))->toBeEmpty()
        ->and(TurnKit::aiNotes($conversation))->toHaveCount(1);
});

it('blocks actions on the grace step, like lookups', function () {
    config(['agent.turn.max_steps' => 1]);
    app()->forgetInstance(TurnSettings::class);
    ['conversation' => $conversation] = TurnKit::autoConversation();
    $model = TurnKit::model([
        Model::call('search_products', []),
        Model::calls([['add_private_note', ['text' => 'Khách hỏi áo.']], ['wait_for_customer', ['reason' => 'x']]]),
    ]);

    TurnKit::customerSays($conversation, 'Shop có gì?');
    TurnKit::runPendingTurns();

    expect($model->requests)->toHaveCount(2)
        ->and(array_filter(TurnKit::aiNotes($conversation), fn (Message $note) => $note->content === 'Khách hỏi áo.'))->toBeEmpty();
});

it('asks with tappable options and lets the turn end without another message', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    $model = TurnKit::model([
        Model::call('send_quick_replies', ['question' => 'Anh lấy size nào ạ?', 'options' => ['M', 'L']]),
        Model::call('wait_for_customer', ['reason' => 'question sent']),
    ]);

    TurnKit::customerSays($conversation, 'Lấy áo trắng');
    TurnKit::runPendingTurns();

    $replies = TurnKit::aiReplies($conversation);

    expect($replies)->toHaveCount(1)
        ->and($replies[0]->contentTypeName())->toBe('input_select')
        ->and($replies[0]->content)->toBe('Anh lấy size nào ạ?')
        ->and($replies[0]->content_attributes['items'])->toBe([['title' => 'M', 'value' => 'M'], ['title' => 'L', 'value' => 'L']]);
});

it('sends a QR to the default account open to the AI with the amount and the shop\'s transfer note', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    PaymentAccount::factory()->create(['account_id' => $conversation->account_id, 'is_default' => true, 'allow_all_agents' => false]);
    $open = PaymentAccount::factory()->create(['account_id' => $conversation->account_id, 'allow_all_agents' => true, 'memo_template' => 'DH {ma_hoi_thoai}']);
    TurnKit::model([
        Model::call('send_bank_transfer', ['amount' => 300000, 'caption' => '2 áo trắng size M']),
        Model::call('reply', ['text' => 'Dạ anh chuyển khoản giúp em theo mã QR nhé.']),
    ]);

    TurnKit::customerSays($conversation, 'Anh chuyển khoản');
    TurnKit::runPendingTurns();

    $card = TurnKit::aiReplies($conversation)[0];

    expect($card->contentTypeName())->toBe('bank_transfer')
        ->and($card->content_attributes)->toMatchArray([
            'payment_account_id' => $open->id,
            'account_number' => $open->account_number,
            'amount' => ['amount' => 300000, 'currency' => 'VND'],
            'memo' => "DH {$conversation->display_id}",
        ]);
});

it('tells the model to hand over when no bank account is open to the AI', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    PaymentAccount::factory()->create(['account_id' => $conversation->account_id, 'is_default' => true, 'allow_all_agents' => false]);
    $model = TurnKit::model([
        Model::call('send_bank_transfer', ['amount' => 300000]),
        Model::call('wait_for_customer', ['reason' => 'x']),
    ]);

    TurnKit::customerSays($conversation, 'Anh chuyển khoản');
    TurnKit::runPendingTurns();

    expect(salesToolResult($model, 1)['error'])->toMatchArray(['code' => 'not_allowed_this_turn', 'retryable' => false])
        ->and(salesToolResult($model, 1)['error']['fix'])->toContain('handoff_to_human')
        ->and(TurnKit::aiReplies($conversation))->toBeEmpty();
});

it('fills only empty profile fields and never takes a phone number from another profile', function () {
    ['conversation' => $conversation, 'contact' => $contact] = TurnKit::autoConversation();
    $contact->update(['name' => AnonymousName::forAccount($conversation->account), 'email' => 'cu@example.com']);
    $other = Contact::factory()->create(['account_id' => $conversation->account_id, 'phone_number' => '+84901111111']);
    CustomAttributeDefinition::query()->create([
        'account_id' => $conversation->account_id, 'attribute_display_name' => 'Địa chỉ giao hàng', 'attribute_key' => 'dia_chi',
        'attribute_model' => CustomAttributeDefinition::MODEL_CONTACT, 'attribute_display_type' => 'text',
    ]);
    CustomAttributeDefinition::query()->create([
        'account_id' => $conversation->account_id, 'attribute_display_name' => 'Size quen', 'attribute_key' => 'size',
        'attribute_model' => CustomAttributeDefinition::MODEL_CONTACT, 'attribute_display_type' => 'list', 'attribute_values' => ['M', 'L'],
    ]);
    $model = TurnKit::model([
        Model::call('save_customer_info', [
            'name' => 'Nguyễn Lan',
            'phone_number' => '0901 111 111',
            'email' => 'moi@example.com',
            'custom_fields' => [['key' => 'dia_chi', 'value' => '12 Lê Lợi, Q1'], ['key' => 'size', 'value' => 'm'], ['key' => 'ghi_chu', 'value' => 'x']],
        ]),
        Model::call('wait_for_customer', ['reason' => 'x']),
    ]);

    TurnKit::customerSays($conversation, 'Em tên Lan, sđt 0901111111');
    TurnKit::runPendingTurns();

    $result = salesToolResult($model, 1);
    $contact->refresh();

    expect($result['data']['saved'])->toEqualCanonicalizing(['name', 'dia_chi', 'size'])
        ->and(array_keys($result['data']['not_saved']))->toEqualCanonicalizing(['phone_number', 'email', 'ghi_chu'])
        ->and($result['hint'])->toContain('add_private_note')
        ->and($contact->name)->toBe('Nguyễn Lan')
        ->and($contact->phone_number)->toBeNull()
        ->and($contact->email)->toBe('cu@example.com')
        ->and($contact->custom_attributes)->toEqual(['dia_chi' => '12 Lê Lợi, Q1', 'size' => 'M'])
        ->and($other->fresh()->exists)->toBeTrue()
        ->and(Contact::query()->where('account_id', $conversation->account_id)->count())->toBe(2);
});

it('keeps a real name and saves a free phone number', function () {
    ['conversation' => $conversation, 'contact' => $contact] = TurnKit::autoConversation();
    $contact->update(['name' => 'Lan Zalo', 'phone_number' => null]);
    $model = TurnKit::model([
        Model::call('save_customer_info', ['name' => 'Trần Lan', 'phone_number' => '0912 345 678']),
        Model::call('wait_for_customer', ['reason' => 'x']),
    ]);

    TurnKit::customerSays($conversation, 'sđt em 0912345678');
    TurnKit::runPendingTurns();

    expect(salesToolResult($model, 1)['data'])->toBe(['saved' => ['phone_number'], 'not_saved' => ['name' => 'the profile already holds a different value, which was kept']])
        ->and($contact->fresh()->only(['name', 'phone_number']))->toBe(['name' => 'Lan Zalo', 'phone_number' => '+84912345678']);
});

it('labels the conversation with an existing label and lists the valid ones on a wrong name', function () {
    ['conversation' => $conversation] = TurnKit::autoConversation();
    Label::factory()->create(['account_id' => $conversation->account_id, 'title' => 'chot-don']);
    Label::factory()->create(['account_id' => Account::factory()->create()->id, 'title' => 'vip']);
    $model = TurnKit::model([
        Model::call('tag_conversation', ['labels' => ['vip']]),
        Model::call('tag_conversation', ['labels' => ['Chot-Don']]),
        Model::call('wait_for_customer', ['reason' => 'x']),
    ]);

    TurnKit::customerSays($conversation, 'Chốt nha');
    TurnKit::runPendingTurns();

    expect(salesToolResult($model, 1)['error']['fix'])->toContain('Use only these: chot-don')
        ->and(salesToolResult($model, 2)['data'])->toBe(['labels' => ['chot-don']])
        ->and($conversation->fresh()->labelList())->toBe(['chot-don']);
});

it('leaves a private order note for the staff and keeps answering automatically', function () {
    ['conversation' => $conversation, 'aiAgent' => $aiAgent] = TurnKit::autoConversation();
    TurnKit::model([
        Model::call('add_private_note', ['text' => 'Đơn: 2 áo trắng size M, COD, giao 12 Lê Lợi.']),
        Model::call('reply', ['text' => 'Dạ em lên đơn cho anh rồi ạ.']),
    ]);

    TurnKit::customerSays($conversation, 'Ok chốt');
    TurnKit::runPendingTurns();

    $notes = TurnKit::aiNotes($conversation);

    expect($notes)->toHaveCount(1)
        ->and($notes[0]->content)->toBe('Đơn: 2 áo trắng size M, COD, giao 12 Lê Lợi.')
        ->and($notes[0]->sender_id)->toBe($aiAgent->id)
        ->and(TurnKit::aiReplies($conversation))->toHaveCount(1)
        ->and((bool) $conversation->fresh()->ai_auto_reply)->toBeTrue();
});

it('reads the profile of this conversation\'s customer with their other conversations and notes', function () {
    ['conversation' => $conversation, 'contact' => $contact] = TurnKit::autoConversation();
    $contact->update(['name' => 'Lan', 'phone_number' => '+84912345678']);
    Note::factory()->create(['contact_id' => $contact->id, 'content' => 'Khách quen, thích màu pastel.']);
    $earlier = Conversation::factory()->create([
        'account_id' => $conversation->account_id, 'inbox_id' => $conversation->inbox_id,
        'contact_id' => $contact->id, 'contact_inbox_id' => $conversation->contact_inbox_id,
    ]);
    TurnKit::customerSays($earlier, 'Áo hôm trước mặc vừa lắm');
    Contact::factory()->create(['account_id' => $conversation->account_id, 'name' => 'Người khác']);
    $model = TurnKit::model([
        Model::call('get_customer_profile'),
        Model::call('wait_for_customer', ['reason' => 'x']),
    ]);

    TurnKit::customerSays($conversation, 'Shop nhớ em không');
    TurnKit::runPendingTurns();

    $profile = salesToolResult($model, 1)['data'];

    expect($profile)->toMatchArray(['name' => 'Lan', 'phone_number' => '+84912345678', 'other_conversations' => 1])
        ->and($profile['staff_notes'][0]['text'])->toBe('Khách quen, thích màu pastel.')
        ->and($profile['recent_conversations'][0]['last_lines'])->toContain('customer: Áo hôm trước mặc vừa lắm');
});
