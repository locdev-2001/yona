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
        Capability::InboundForward->value => 'telegram_forward',
    ];

    private ?Conversation $conversation = null;

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
            'api.telegram.org/file/*' => Http::response('binary-image', 200, ['Content-Type' => 'image/jpeg']),
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

        (new TelegramEventsJob([
            'bot_token' => $this->inbox->channel->bot_token,
            'telegram' => ChannelFixture::load($fixture),
        ]))->handle();

        return Message::query()->latest('id')->firstOrFail();
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
