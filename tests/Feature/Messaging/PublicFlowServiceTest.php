<?php

use App\Builders\Messages\MessageBuilder;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageAccessToken;
use App\Models\User;
use App\Services\Messaging\PublicFlowService;

// Vé một-lần (hoặc nhiều lần với trang chỉ xem) của trang công khai `/m/{token}`
// (phase-05 §C) — DB chỉ lưu hash, chống dò bằng cách trả null như nhau cho token
// sai/hết hạn/đã dùng.

function scheduleMessage(): Message
{
    $conversation = Conversation::factory()->create();

    return (new MessageBuilder(User::factory()->create(), $conversation, [
        'content_type' => 'webview',
        'content_attributes' => [
            'page' => 'schedule',
            'title' => 'Chọn lịch nhận hàng',
            'data' => ['slots' => [['date' => '2026-09-27', 'label' => '8:00 đến 10:00', 'value' => 't7-am']]],
        ],
    ]))->perform();
}

it('chỉ lưu hash của token, không lưu chuỗi thật', function () {
    $message = scheduleMessage();

    $url = app(PublicFlowService::class)->issue($message, 'schedule');

    $token = Str::afterLast($url, '/');
    $record = MessageAccessToken::query()->sole();

    expect($record->token_hash)->toBe(hash('sha256', $token))
        ->and($record->token_hash)->not->toBe($token)
        ->and($record->purpose)->toBe('schedule')
        ->and($record->message_id)->toBe($message->id)
        ->and($record->expires_at->isBetween(now()->addDays(13), now()->addDays(15)))->toBeTrue();
});

it('resolve trả về bản ghi cho token đúng', function () {
    $message = scheduleMessage();
    $url = app(PublicFlowService::class)->issue($message, 'schedule');
    $token = Str::afterLast($url, '/');

    $record = app(PublicFlowService::class)->resolve($token);

    expect($record)->not->toBeNull()
        ->and($record->message_id)->toBe($message->id);
});

it('resolve trả về null cho token sai, hết hạn, hoặc đã dùng — không phân biệt được lý do nào', function () {
    $flows = app(PublicFlowService::class);
    $message = scheduleMessage();

    expect($flows->resolve('token-khong-ton-tai'))->toBeNull();

    $expiredUrl = $flows->issue($message, 'schedule');
    $expiredToken = Str::afterLast($expiredUrl, '/');
    MessageAccessToken::query()->where('token_hash', hash('sha256', $expiredToken))->update(['expires_at' => now()->subMinute()]);
    expect($flows->resolve($expiredToken))->toBeNull();

    $consumedUrl = $flows->issue($message, 'schedule');
    $consumedToken = Str::afterLast($consumedUrl, '/');
    $flows->consume($flows->resolve($consumedToken));
    expect($flows->resolve($consumedToken))->toBeNull();
});

it('consume ghi consumed_at, sau đó resolve không trả về nữa', function () {
    $flows = app(PublicFlowService::class);
    $message = scheduleMessage();
    $url = $flows->issue($message, 'schedule');
    $token = Str::afterLast($url, '/');
    $record = $flows->resolve($token);

    $flows->consume($record);

    expect($record->fresh()->consumed_at)->not->toBeNull()
        ->and($flows->resolve($token))->toBeNull();
});
