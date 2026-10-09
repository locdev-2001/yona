<?php

use App\Models\Conversation;
use App\Models\Message;

beforeEach(function () {
    $this->conversation = Conversation::factory()->create();
    $attributes = fn (array $extra) => [
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->conversation->inbox_id,
        'conversation_id' => $this->conversation->id,
        'message_type' => Message::TYPE_INCOMING,
        'sender_type' => 'Contact',
        'sender_id' => $this->conversation->contact_id,
        ...$extra,
    ];

    $this->earlierText = Message::factory()->create($attributes([
        'content' => 'Mai chị qua lấy hàng nhé',
        'created_at' => now()->subHour(),
        'content_attributes' => ['zca_message' => ['msgType' => 'webchat', 'content' => 'Mai chị qua lấy hàng nhé']],
    ]));
    $this->chatTip = Message::factory()->create($attributes([
        'content' => 'Khách A tạo nhắc hẹn mới Dậy - 06:05.',
        'created_at' => now(),
        'content_attributes' => ['zca_message' => ['msgType' => 'webchat', 'content' => [
            'title' => 'Khách A tạo nhắc hẹn mới Dậy - 06:05.',
            'action' => 'msginfo.actionlist',
        ]]],
    ]));
});

it('chuyển dòng thông báo hệ thống Zalo đã lưu nhầm thành tin hoạt động, xem trước rơi về tin thường', function () {
    $this->artisan('messages:repair-zalo-chat-tips')
        ->expectsOutputToContain('Đã chuyển 1 tin thành tin hoạt động')
        ->assertSuccessful();

    $repaired = $this->chatTip->refresh();

    expect($repaired->message_type)->toBe(Message::TYPE_ACTIVITY)
        ->and($repaired->sender_id)->toBeNull()
        ->and($repaired->sender_type)->toBeNull()
        ->and($this->earlierText->refresh()->message_type)->toBe(Message::TYPE_INCOMING)
        ->and($this->conversation->refresh()->lastNonActivityMessage()?->id)->toBe($this->earlierText->id);
});

it('chạy lại không đổi gì thêm', function () {
    $this->artisan('messages:repair-zalo-chat-tips')->assertSuccessful();

    $this->artisan('messages:repair-zalo-chat-tips')
        ->expectsOutputToContain('Đã chuyển 0 tin thành tin hoạt động')
        ->assertSuccessful();
});

it('--dry-run chỉ in số đếm và id, không ghi gì', function () {
    $this->artisan('messages:repair-zalo-chat-tips', ['--dry-run' => true])
        ->expectsOutputToContain("#{$this->chatTip->id}")
        ->expectsOutputToContain('Thử chạy: 1 tin sẽ chuyển thành tin hoạt động')
        ->assertSuccessful();

    expect($this->chatTip->refresh()->message_type)->toBe(Message::TYPE_INCOMING);
});
