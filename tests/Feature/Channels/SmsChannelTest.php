<?php

use App\Models\Inbox;
use App\Models\Message;
use Illuminate\Support\Facades\Http;
use Tests\Feature\Channels\ChannelFixture;

// Port từ spec/services/sms/{incoming_message_service,delivery_status_service}_spec.rb
// + spec/controllers/webhooks/sms_controller_spec.rb.

beforeEach(function () {
    $this->inbox = Inbox::factory()->sms()->create();
    $this->channel = $this->inbox->channel;
    $this->channel->update(['phone_number' => '+15551234567']);
});

it('tạo liên hệ, hội thoại và tin đến từ webhook Bandwidth', function () {
    Http::fake();

    $this->postJson('/webhooks/sms/'.urlencode('+15551234567'), ChannelFixture::load('sms_incoming'))->assertOk();

    $message = Message::query()->latest('id')->first();

    expect($message)->not->toBeNull()
        ->and($message->content)->toBe('Xin chào từ SMS')
        ->and($message->source_id)->toBe('1627916692457Kx0y2Nqp')
        ->and($message->conversation->contact->phone_number)->toBe('+15557654321');
});

it('cập nhật trạng thái khi Bandwidth báo giao thất bại', function () {
    Http::fake();
    $this->postJson('/webhooks/sms/'.urlencode('+15551234567'), ChannelFixture::load('sms_incoming'));
    $message = Message::query()->latest('id')->first();

    $this->postJson('/webhooks/sms/'.urlencode('+15551234567'), [[
        'type' => 'message-failed',
        'to' => '+15551234567',
        'errorCode' => 4405,
        'description' => 'Rejected',
        'message' => ['id' => $message->source_id],
    ]])->assertOk();

    expect($message->fresh()->status)->toBe(Message::STATUSES['failed'])
        ->and($message->fresh()->content_attributes['external_error'])->toBe('4405 - Rejected');
});

it('gửi tin đi qua Bandwidth và lưu source_id', function () {
    Http::fake(['messaging.bandwidth.com/*' => Http::response(['id' => 'bw-outgoing-1'])]);
    $this->postJson('/webhooks/sms/'.urlencode('+15551234567'), ChannelFixture::load('sms_incoming'));

    $conversation = Message::query()->latest('id')->first()->conversation;
    $outgoing = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Chào bạn',
    ]);

    Http::assertSent(fn ($request) => str_contains($request->url(), 'messaging.bandwidth.com')
        && $request['to'] === '+15557654321'
        && $request['from'] === '+15551234567'
        && $request['text'] === 'Chào bạn');

    expect($outgoing->fresh()->source_id)->toBe('bw-outgoing-1');
});

it('tin có lựa chọn (không có nút gốc trên SMS) gửi chữ kèm danh sách đánh số', function () {
    app()->setLocale('vi');
    Http::fake(['messaging.bandwidth.com/*' => Http::response(['id' => 'bw-outgoing-2'])]);
    $this->postJson('/webhooks/sms/'.urlencode('+15551234567'), ChannelFixture::load('sms_incoming'));

    $conversation = Message::query()->latest('id')->first()->conversation;
    $outgoing = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Bạn muốn nhận hàng khi nào?',
        'content_type' => Message::CONTENT_TYPES['input_select'],
        'content_attributes' => ['items' => [
            ['title' => 'Giờ hành chính', 'value' => 'office_hours'],
            ['title' => 'Buổi tối', 'value' => 'evening'],
        ]],
    ]);

    Http::assertSent(fn ($request) => str_contains($request->url(), 'messaging.bandwidth.com')
        && $request['text'] === "Bạn muốn nhận hàng khi nào?\n\nNhắn số tương ứng để chọn:\n1. Giờ hành chính\n2. Buổi tối");

    expect($outgoing->fresh()->source_id)->toBe('bw-outgoing-2');
});
