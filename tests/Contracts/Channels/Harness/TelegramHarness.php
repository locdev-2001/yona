<?php

namespace Tests\Contracts\Channels\Harness;

use App\Channels\Capability;
use App\Jobs\Webhooks\TelegramEventsJob;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Telegram\SendOnTelegramService;
use Illuminate\Support\Facades\Http;
use LogicException;
use Tests\Feature\Channels\ChannelFixture;

/** Kênh mẫu cho khung contract: Telegram đã có fixture payload thật trong tests/Fixtures/channels. */
final class TelegramHarness implements ChannelHarness
{
    /** Fixture thật cho từng năng lực tin đến. */
    private const INBOUND_FIXTURES = [
        Capability::InboundText->value => 'telegram_text',
        Capability::InboundImage->value => 'telegram_photo',
        Capability::InboundSticker->value => 'telegram_sticker',
        Capability::InboundFile->value => 'telegram_document',
        Capability::InboundVideo->value => 'telegram_video',
        Capability::InboundAudio->value => 'telegram_audio',
        Capability::InboundLocation->value => 'telegram_location',
        Capability::InboundContactCard->value => 'telegram_contact',
        Capability::InboundForward->value => 'telegram_forward',
    ];

    private ?Conversation $conversation = null;

    private int $sequence = 0;

    public function __construct(private readonly Inbox $inbox)
    {
        $this->fakeBotApi();
    }

    /** Cài lại fake trước mỗi lần gửi: Http::fake() xoá sổ ghi, nên payload thu được chỉ của lần gửi này. */
    private function fakeBotApi(): void
    {
        Http::fake([
            'api.telegram.org/*getUserProfilePhotos*' => Http::response(['ok' => true, 'result' => ['photos' => []]]),
            'api.telegram.org/*getFile*' => Http::response(['ok' => true, 'result' => ['file_path' => 'photos/file_1.jpg']]),
            // Closure: mỗi lần tải một stream mới, không thì lần tải thứ hai (sticker sau ảnh) nhận stream đã cạn.
            'api.telegram.org/file/*' => fn () => Http::response('binary-image', 200, ['Content-Type' => 'image/jpeg']),
            'api.telegram.org/*sendMediaGroup*' => Http::response(['ok' => true, 'result' => [['message_id' => 998]]]),
            'api.telegram.org/*' => Http::response(['ok' => true, 'result' => ['message_id' => 999]]),
        ]);
    }

    public function inbox(): Inbox
    {
        return $this->inbox;
    }

    public function conversation(): Conversation
    {
        return $this->conversation ??= $this->receiveInbound(Capability::InboundText)->conversation;
    }

    public function receiveInbound(Capability $capability): Message
    {
        $fixture = self::INBOUND_FIXTURES[$capability->value]
            ?? throw new LogicException("Telegram chưa có fixture cho {$capability->value}");

        return $this->dispatch(ChannelFixture::load($fixture));
    }

    public function receiveReply(Message $quoted): Message
    {
        $payload = ChannelFixture::load('telegram_text');
        $payload['message']['reply_to_message'] = ['message_id' => (int) $quoted->source_id];

        return $this->dispatch($payload);
    }

    /** Lõi chống trùng theo message_id: mỗi lượt nhận là một tin mới của Telegram. */
    private function dispatch(array $payload): Message
    {
        $payload['update_id'] = 900000 + ++$this->sequence;
        $payload['message']['message_id'] = 900000 + $this->sequence;

        (new TelegramEventsJob([
            'bot_token' => $this->inbox->channel->bot_token,
            'telegram' => $payload,
        ]))->handle();

        return Message::query()->where('source_id', (string) $payload['message']['message_id'])->firstOrFail();
    }

    public function sendOutbound(Message $message): OutboundAttempt
    {
        $this->fakeBotApi();

        (new SendOnTelegramService($message))->perform();

        $payloads = Http::recorded()
            ->map(fn (array $pair) => $pair[0]->data())
            ->values()
            ->all();

        return new OutboundAttempt($message->fresh(), $payloads);
    }

    public function receiveEvent(Capability $capability, Message $target): void
    {
        throw new LogicException('Telegram chưa khai báo sự kiện trạng thái nào — contract không được gọi tới đây.');
    }
}
