<?php

use App\Builders\Messages\MessageBuilder;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Carbon;
use Tests\Support\WidgetSession;

// ChoiceReplyResolver (app/Listeners/ChoiceReplyResolver.php): khách gõ một con số trên
// kênh không có chip/nút gốc để trả lời tin có lựa chọn (phase-06 §6a).

function resolverConversation(): Conversation
{
    // Có sẵn email: tránh kích hoạt luồng "widget xin email" của tin đến đầu tiên, không liên quan tới resolver này.
    $session = WidgetSession::make(contactAttributes: ['email' => 'khach@vi.example']);

    return Conversation::factory()->create([
        'account_id' => $session->account->id,
        'inbox_id' => $session->inbox->id,
        'contact_id' => $session->contact->id,
        'contact_inbox_id' => $session->contactInbox->id,
    ]);
}

function askChoice(Conversation $conversation, array $items, ?Carbon $createdAt = null): Message
{
    $message = (new MessageBuilder(User::factory()->create(), $conversation, [
        'content' => 'Bạn muốn nhận hàng khi nào ạ?',
        'content_type' => 'input_select',
        'content_attributes' => ['items' => $items],
    ]))->perform();

    if ($createdAt !== null) {
        // created_at không nằm trong $fillable — update() mass-assign sẽ lặng lẽ bỏ qua.
        $message->forceFill(['created_at' => $createdAt])->save();
    }

    return $message;
}

function customerReplies(Conversation $conversation, string $content): Message
{
    return $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_INCOMING,
        'content' => $content,
    ]);
}

it('"2" map đúng lựa chọn thứ hai, không tạo tin trả lời thứ hai', function () {
    $conversation = resolverConversation();
    $question = askChoice($conversation, [
        ['title' => 'Giờ hành chính', 'value' => 'office_hours'],
        ['title' => 'Buổi tối', 'value' => 'evening'],
    ]);
    $countBefore = Message::count();

    $reply = customerReplies($conversation, '2');

    expect($question->fresh()->content_attributes['submitted_values'])->toBe([['title' => 'Buổi tối', 'value' => 'evening']])
        ->and($reply->fresh()->content_attributes['choice_of'])->toBe($question->id)
        ->and(Message::count())->toBe($countBefore + 1);
});

it('" 2. " bỏ khoảng trắng và dấu chấm rồi vẫn map đúng', function () {
    $conversation = resolverConversation();
    $question = askChoice($conversation, [
        ['title' => 'Giờ hành chính', 'value' => 'office_hours'],
        ['title' => 'Buổi tối', 'value' => 'evening'],
    ]);

    customerReplies($conversation, ' 2. ');

    expect($question->fresh()->content_attributes['submitted_values'])->toBe([['title' => 'Buổi tối', 'value' => 'evening']]);
});

it('"5" ngoài danh sách thì bỏ qua', function () {
    $conversation = resolverConversation();
    $question = askChoice($conversation, [
        ['title' => 'Giờ hành chính', 'value' => 'office_hours'],
        ['title' => 'Buổi tối', 'value' => 'evening'],
    ]);

    $reply = customerReplies($conversation, '5');

    expect($question->fresh()->content_attributes)->not->toHaveKey('submitted_values')
        ->and($reply->fresh()->content_attributes)->not->toHaveKey('choice_of');
});

it('"ok" và "2 cái" không phải số thuần thì bỏ qua', function (string $content) {
    $conversation = resolverConversation();
    $question = askChoice($conversation, [['title' => 'Có', 'value' => 'yes'], ['title' => 'Không', 'value' => 'no']]);

    customerReplies($conversation, $content);

    expect($question->fresh()->content_attributes)->not->toHaveKey('submitted_values');
})->with(['ok', '2 cái']);

it('quá 24 giờ thì bỏ qua', function () {
    $conversation = resolverConversation();
    $question = askChoice($conversation, [
        ['title' => 'Giờ hành chính', 'value' => 'office_hours'],
        ['title' => 'Buổi tối', 'value' => 'evening'],
    ], createdAt: now()->subHours(30));

    customerReplies($conversation, '1');

    expect($question->fresh()->content_attributes)->not->toHaveKey('submitted_values');
});

it('hai tin lựa chọn liên tiếp thì lấy tin mới nhất', function () {
    $conversation = resolverConversation();
    $first = askChoice($conversation, [['title' => 'A', 'value' => 'a'], ['title' => 'B', 'value' => 'b']]);
    $second = askChoice($conversation, [['title' => 'C', 'value' => 'c'], ['title' => 'D', 'value' => 'd']]);

    customerReplies($conversation, '1');

    expect($first->fresh()->content_attributes)->not->toHaveKey('submitted_values')
        ->and($second->fresh()->content_attributes['submitted_values'])->toBe([['title' => 'C', 'value' => 'c']]);
});

it('tin đã có lựa chọn trả lời rồi thì tin cũ hơn liền trước được xét tiếp', function () {
    $conversation = resolverConversation();
    $first = askChoice($conversation, [['title' => 'A', 'value' => 'a']]);
    $second = askChoice($conversation, [['title' => 'B', 'value' => 'b']]);
    $second->update(['content_attributes' => [...$second->content_attributes, 'submitted_values' => [['title' => 'B', 'value' => 'b']]]]);

    customerReplies($conversation, '1');

    expect($first->fresh()->content_attributes['submitted_values'])->toBe([['title' => 'A', 'value' => 'a']]);
});
