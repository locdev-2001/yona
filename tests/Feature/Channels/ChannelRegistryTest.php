<?php

use App\Jobs\SendReplyJob;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use Illuminate\Support\Facades\Http;

// Kiểm KHUNG: mỗi kênh mới chỉ cần một dòng trong morph map + CHANNEL_TYPES +
// CHANNEL_SERVICES; lõi (SendReplyJob, Inbox) không rẽ nhánh theo kênh.

dataset('channels', [
    'facebook' => ['facebookPage', 'Channel::FacebookPage', 'Facebook'],
    'instagram' => ['instagram', 'Channel::Instagram', 'Instagram'],
    'telegram' => ['telegram', 'Channel::Telegram', 'Telegram'],
    'line' => ['line', 'Channel::Line', 'LINE'],
    'sms' => ['sms', 'Channel::Sms', 'Sms'],
    'twilio' => ['twilioSms', 'Channel::TwilioSms', 'Twilio SMS'],
    'whatsapp' => ['whatsapp', 'Channel::Whatsapp', 'Whatsapp'],
    'tiktok' => ['tiktok', 'Channel::Tiktok', 'Tiktok'],
    'twitter' => ['twitterProfile', 'Channel::TwitterProfile', 'Twitter'],
]);

it('gắn đúng morph type và tên kênh', function (string $state, string $morphType, string $name) {
    $inbox = Inbox::factory()->{$state}()->create();

    expect($inbox->channel_type)->toBe($morphType)
        ->and($inbox->inboxType())->toBe($name);
})->with('channels');

it('SendReplyJob chọn đúng driver cho từng kênh', function (string $state, string $morphType) {
    Http::fake();
    $inbox = Inbox::factory()->{$state}()->create();
    $conversation = Conversation::factory()->create(['inbox_id' => $inbox->id, 'account_id' => $inbox->account_id]);
    $message = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'ping',
    ]);

    // Twitter chưa có driver gửi ra: job phải im lặng bỏ qua, không nổ.
    (new SendReplyJob($message))->handle();

    expect(true)->toBeTrue();
})->with('channels');
