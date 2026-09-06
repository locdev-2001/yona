<?php

namespace Tests\Contracts\Channels\Harness;

use App\Channels\Capability;
use App\Jobs\Webhooks\ZaloEventsJob;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Zalo\BridgeEventService;
use App\Services\Zalo\SendOnZaloService;
use Illuminate\Support\Facades\Http;
use LogicException;
use Tests\Feature\Channels\ChannelFixture;

/**
 * Zalo cá nhân trong khung contract. Fixture là payload THẬT của bridge
 * (tests/Fixtures/channels/zalo_*.json, đã ẩn PII); bridge và CDN Zalo được giả
 * bằng Http::fake nên contract đo đúng cái driver bắn ra.
 */
final class ZaloHarness implements ChannelHarness
{
    /** Fixture thật cho từng năng lực tin đến. */
    private const INBOUND_FIXTURES = [
        // Bản có `listener_data` để driver lưu được ảnh chụp zca — trích dẫn chiều
        // ra của Zalo dựng từ đó (SendMessageQuote cần đủ 6 trường).
        Capability::InboundText->value => 'zalo_contract_text',
        Capability::InboundImage->value => 'zalo_inbound_image',
    ];

    private ?Conversation $conversation = null;

    private int $sequence = 0;

    public function __construct(private readonly Inbox $inbox)
    {
        $this->fakeBridge();
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
            ?? throw new LogicException("Zalo chưa có fixture cho {$capability->value}");

        // Driver dedupe theo `source_id` trên cả inbox: bơm cùng một fixture hai lần
        // (contract này gọi, contract kia gọi) phải ra hai tin khác nhau như đời thật.
        $payload = ChannelFixture::load($fixture);
        $sourceId = $payload['source_id'].'-'.(++$this->sequence);
        $payload['source_id'] = $sourceId;

        if (isset($payload['listener_data']['msgId'])) {
            $payload['listener_data']['msgId'] = $sourceId;
            $payload['listener_data']['cliMsgId'] = $payload['listener_data']['cliMsgId'].$this->sequence;
        }

        $this->dispatch($payload);

        return Message::query()->where('source_id', $sourceId)->firstOrFail();
    }

    public function sendOutbound(Message $message): OutboundAttempt
    {
        $this->fakeBridge();

        (new SendOnZaloService($message))->perform();

        $payloads = Http::recorded()
            ->map(fn (array $pair) => $pair[0]->data())
            ->values()
            ->all();

        return new OutboundAttempt($message->fresh(), $payloads);
    }

    public function receiveEvent(Capability $capability, Message $target): void
    {
        $fixture = match ($capability) {
            Capability::EventSeen => 'zalo_relay_seen',
            Capability::EventDelivered => 'zalo_relay_delivered',
            default => throw new LogicException("Zalo chưa có fixture sự kiện cho {$capability->value}"),
        };

        $payload = ChannelFixture::load($fixture);
        $payload['payload'][0][0]['data']['msgId'] = $target->source_id;

        $this->dispatch($payload);
    }

    /** @param array<string, mixed> $payload */
    private function dispatch(array $payload): void
    {
        (new ZaloEventsJob([...$payload, 'connection_id' => $this->inbox->channel->connectionId()]))
            ->handle(app(BridgeEventService::class));
    }

    /** Cài lại fake trước mỗi lần gửi: Http::fake() xoá sổ ghi, nên payload thu được chỉ của lần gửi này. */
    private function fakeBridge(): void
    {
        Http::fake([
            'cdn.zalo.test/*' => Http::response('binary-image', 200, ['Content-Type' => 'image/jpeg']),
            '*/personal-messages/send' => Http::response(['ok' => true, 'source_id' => 'contract-sent-'.uniqid()]),
            '*' => Http::response(['ok' => true]),
        ]);
    }
}
