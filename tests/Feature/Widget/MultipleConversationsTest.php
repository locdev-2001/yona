<?php

use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Message;
use Tests\Support\WidgetSession;

// Một khách có nhiều hội thoại: widget gửi `conversation_id` (display_id) trên mọi
// request; không gửi thì vẫn là hội thoại mới nhất như SDK đời cũ.

function sessionConversation(WidgetSession $session, array $attributes = []): Conversation
{
    return Conversation::factory()->create([
        'account_id' => $session->account->id,
        'inbox_id' => $session->inbox->id,
        'contact_id' => $session->contact->id,
        'contact_inbox_id' => $session->contactInbox->id,
        ...$attributes,
    ]);
}

function conversationMessage(Conversation $conversation, int $type, string $content, array $attributes = []): Message
{
    return Message::factory()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
        'message_type' => $type,
        'content' => $content,
        ...$attributes,
    ]);
}

it('đọc tin của đúng hội thoại được chọn, không phải hội thoại mới nhất', function () {
    $session = WidgetSession::make();
    $older = sessionConversation($session);
    $newer = sessionConversation($session);
    conversationMessage($older, Message::TYPE_OUTGOING, 'tin hội thoại cũ');
    conversationMessage($newer, Message::TYPE_OUTGOING, 'tin hội thoại mới');

    $default = $this->getJson($session->url('messages'), $session->headers())->assertOk()->json('payload');
    $chosen = $this->getJson($session->url('messages', ['conversation_id' => $older->display_id]), $session->headers())->assertOk()->json('payload');

    expect(collect($default)->pluck('content'))->toContain('tin hội thoại mới')->not->toContain('tin hội thoại cũ')
        ->and(collect($chosen)->pluck('content'))->toContain('tin hội thoại cũ')->not->toContain('tin hội thoại mới');
});

it('gửi tin vào đúng hội thoại được chọn', function () {
    $session = WidgetSession::make();
    $older = sessionConversation($session);
    sessionConversation($session);

    $this->postJson($session->url('messages', ['conversation_id' => $older->display_id]), ['message' => ['content' => 'hỏi tiếp đơn cũ']], $session->headers())
        ->assertOk();

    expect($older->messages()->where('content', 'hỏi tiếp đơn cũ')->exists())->toBeTrue();
});

it('conversation_id=new mở hội thoại mới thay vì viết tiếp hội thoại cũ', function () {
    $session = WidgetSession::make();
    $existing = sessionConversation($session);

    $response = $this->postJson($session->url('messages', ['conversation_id' => 'new']), ['message' => ['content' => 'chuyện khác']], $session->headers())
        ->assertOk();

    expect($response->json('conversation_id'))->not->toBe($existing->display_id)
        ->and($session->contact->conversations()->count())->toBe(2);
});

it('hội thoại của khách khác là 404, không rơi về hội thoại của mình', function () {
    $session = WidgetSession::make();
    sessionConversation($session);
    // Khách khác trên CÙNG hộp thư: display_id đánh số theo account nên phải cùng account mới là số thật của người khác.
    $otherContact = Contact::factory()->create(['account_id' => $session->account->id]);
    $otherContactInbox = ContactInbox::factory()->create(['contact_id' => $otherContact->id, 'inbox_id' => $session->inbox->id]);
    $foreign = Conversation::factory()->create([
        'account_id' => $session->account->id,
        'inbox_id' => $session->inbox->id,
        'contact_id' => $otherContact->id,
        'contact_inbox_id' => $otherContactInbox->id,
    ]);

    $this->postJson($session->url('messages', ['conversation_id' => $foreign->display_id]), ['message' => ['content' => 'x']], $session->headers())
        ->assertNotFound();
    $this->getJson($session->url('messages', ['conversation_id' => 999999]), $session->headers())->assertNotFound();

    expect($foreign->messages()->where('content', 'x')->exists())->toBeFalse();
});

describe('GET conversations/list', function () {
    it('liệt kê hội thoại của khách, mới hoạt động trước, kèm số tin shop gửi chưa đọc', function () {
        $session = WidgetSession::make();
        $read = sessionConversation($session, ['last_activity_at' => now()->subDay(), 'contact_last_seen_at' => now()]);
        $unread = sessionConversation($session, ['last_activity_at' => now(), 'contact_last_seen_at' => now()->subHour()]);
        conversationMessage($read, Message::TYPE_OUTGOING, 'đã xem', ['created_at' => now()->subDays(2)]);
        conversationMessage($unread, Message::TYPE_OUTGOING, 'Dạ còn 2 cái ạ');
        conversationMessage($unread, Message::TYPE_OUTGOING, 'Phí ship 30.000đ');
        sessionConversation(WidgetSession::make());

        $payload = $this->getJson($session->url('conversations/list'), $session->headers())->assertOk()->json('payload');

        expect(collect($payload)->pluck('id')->all())->toBe([$unread->display_id, $read->display_id])
            ->and($payload[0]['unread_count'])->toBe(2)
            ->and($payload[0]['last_message']['preview'])->toBe('Phí ship 30.000đ')
            ->and($payload[1]['unread_count'])->toBe(0);
    });

    it('không bao giờ lộ ghi chú nội bộ ra dòng xem trước', function () {
        $session = WidgetSession::make();
        $conversation = sessionConversation($session);
        conversationMessage($conversation, Message::TYPE_OUTGOING, 'Dạ shop gửi hàng rồi ạ');
        conversationMessage($conversation, Message::TYPE_OUTGOING, 'khách này hay bom hàng', ['private' => true]);

        $payload = $this->getJson($session->url('conversations/list'), $session->headers())->assertOk()->json('payload');

        expect($payload[0]['last_message']['preview'])->toBe('Dạ shop gửi hàng rồi ạ')
            ->and($payload[0]['unread_count'])->toBe(1);
    });

    it('xem trước tin có cấu trúc bằng chính loại tin', function () {
        $session = WidgetSession::make();
        $conversation = sessionConversation($session);
        conversationMessage($conversation, Message::TYPE_OUTGOING, '', [
            'content' => null,
            'content_type' => Message::CONTENT_TYPES['order_status'],
            'content_attributes' => ['order_ref' => 'GM1024', 'status' => 'delivering'],
        ]);
        app()->setLocale('vi');

        $payload = $this->getJson($session->url('conversations/list'), $session->headers())->assertOk()->json('payload');

        expect($payload[0]['last_message']['preview'])->toBe('Đơn #GM1024 · Đang giao');
    });
});
