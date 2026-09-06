<?php

use App\Jobs\Webhooks\TelegramEventsJob;
use App\Models\Channel\Telegram;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Telegram\SendOnTelegramService;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\Feature\Channels\ChannelFixture;

// Port từ spec/services/telegram/incoming_message_service_spec.rb +
// spec/controllers/webhooks/telegram_controller_spec.rb.

function fakeTelegramApi(array $overrides = []): void
{
    Http::fake([
        'api.telegram.org/*getUserProfilePhotos*' => Http::response(['ok' => true, 'result' => ['photos' => []]]),
        'api.telegram.org/*getFile*' => Http::response(['ok' => true, 'result' => ['file_path' => 'photos/file_1.jpg']]),
        'api.telegram.org/file/*' => Http::response('binary-image', 200, ['Content-Type' => 'image/jpeg']),
        'api.telegram.org/*sendMessage*' => Http::response(['ok' => true, 'result' => ['message_id' => 999]]),
        'api.telegram.org/*' => Http::response(['ok' => true, 'result' => []]),
        ...$overrides,
    ]);
}

beforeEach(function () {
    $this->inbox = Inbox::factory()->telegram()->create();
    $this->channel = $this->inbox->channel;
});

it('nhận webhook và dựng liên hệ + hội thoại + tin đến', function () {
    fakeTelegramApi();
    $this->postJson("/webhooks/telegram/{$this->channel->bot_token}", ChannelFixture::load('telegram_text')['message'] === null ? [] : ['message' => ChannelFixture::load('telegram_text')['message']])
        ->assertOk();

    $message = Message::query()->latest('id')->first();

    expect($message)->not->toBeNull()
        ->and($message->content)->toBe('Test message')
        ->and($message->message_type)->toBe(Message::TYPE_INCOMING)
        ->and($message->source_id)->toBe('1128')
        ->and($message->conversation->contact->name)->toBe('Sojan Jose')
        ->and($message->conversation->contactInbox->source_id)->toBe('23')
        ->and($message->conversation->additional_attributes['chat_id'])->toBe(23);
});

it('đẩy payload vào hàng đợi thay vì xử lý trong request', function () {
    Bus::fake();
    $this->postJson("/webhooks/telegram/{$this->channel->bot_token}", ['message' => []])->assertOk();

    Bus::assertDispatched(TelegramEventsJob::class);
});

it('bỏ qua chat nhóm', function () {
    fakeTelegramApi();
    (new TelegramEventsJob([
        'bot_token' => $this->channel->bot_token,
        'telegram' => ChannelFixture::load('telegram_group'),
    ]))->handle();

    expect(Message::query()->count())->toBe(0);
});

it('bỏ qua webhook khi không tìm thấy kênh', function () {
    fakeTelegramApi();
    (new TelegramEventsJob(['bot_token' => 'khong-ton-tai', 'telegram' => ChannelFixture::load('telegram_text')]))->handle();

    expect(Conversation::query()->count())->toBe(0);
});

it('tải ảnh đính kèm về từ Telegram', function () {
    fakeTelegramApi();
    (new TelegramEventsJob([
        'bot_token' => $this->channel->bot_token,
        'telegram' => ChannelFixture::load('telegram_photo'),
    ]))->handle();

    $message = Message::query()->latest('id')->first();

    expect($message->content)->toBe('Ảnh của tôi')
        ->and($message->attachments)->toHaveCount(1)
        ->and($message->attachments->first()->fileTypeName())->toBe('image');
});

it('gửi tin đi qua Bot API và lưu source_id', function () {
    fakeTelegramApi();
    (new TelegramEventsJob([
        'bot_token' => $this->channel->bot_token,
        'telegram' => ChannelFixture::load('telegram_text'),
    ]))->handle();

    $conversation = Conversation::query()->latest('id')->first();
    $outgoing = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Chào bạn',
    ]);

    (new SendOnTelegramService($outgoing))->perform();

    Http::assertSent(fn ($request) => str_contains($request->url(), '/sendMessage')
        && $request['chat_id'] == 23
        && $request['text'] === 'Chào bạn');

    expect($outgoing->fresh()->source_id)->toBe('999');
});

it('đánh dấu tin thất bại khi Telegram trả ok=false', function () {
    fakeTelegramApi([
        'api.telegram.org/*sendMessage*' => Http::response(['ok' => false, 'error_code' => 400, 'description' => 'chat not found']),
    ]);

    $conversation = Conversation::factory()->create(['inbox_id' => $this->inbox->id, 'account_id' => $this->inbox->account_id]);
    $conversation->update(['additional_attributes' => ['chat_id' => 23]]);
    $message = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'Chào bạn',
    ]);

    (new SendOnTelegramService($message))->perform();

    expect($message->fresh()->status)->toBe(Message::STATUSES['failed'])
        ->and($message->fresh()->content_attributes['external_error'])->toBe('400, chat not found');
});

it('không gửi lại tin đã mang source_id (chống vòng lặp echo)', function () {
    fakeTelegramApi();
    $conversation = Conversation::factory()->create(['inbox_id' => $this->inbox->id, 'account_id' => $this->inbox->account_id]);
    $message = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'echo',
        'source_id' => 'da-co',
    ]);

    (new SendOnTelegramService($message))->perform();

    Http::assertNotSent(fn ($request) => str_contains($request->url(), '/sendMessage'));
});

it('kênh telegram khai đúng tên và morph type', function () {
    expect($this->channel)->toBeInstanceOf(Telegram::class)
        ->and($this->channel->name())->toBe('Telegram')
        ->and($this->inbox->channel_type)->toBe('Channel::Telegram');
});

it('lưu bot_token dạng mã hóa + cột băm để webhook vẫn tra được', function () {
    fakeTelegramApi();

    $stored = DB::table('channel_telegram')->where('id', $this->channel->id)->first();

    expect($stored->bot_token)->not->toBe($this->channel->bot_token)
        ->and($stored->bot_token_hash)->toBe(hash('sha256', $this->channel->bot_token))
        ->and(Crypt::decryptString($stored->bot_token))->toBe($this->channel->bot_token)
        ->and(Telegram::findByBotToken($this->channel->bot_token)?->id)->toBe($this->channel->id)
        ->and(Telegram::findByBotToken('token-khac'))->toBeNull();

    $this->postJson("/webhooks/telegram/{$this->channel->bot_token}", ['message' => ChannelFixture::load('telegram_text')['message']])
        ->assertOk();

    expect(Message::query()->latest('id')->first())->not->toBeNull();
});
