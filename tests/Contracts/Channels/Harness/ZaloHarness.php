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
 * Zalo cá nhân trong khung contract. Fixture là bộ vàng trích từ payload THẬT của
 * bridge (tests/Fixtures/channels/zalo/real/*.json — PII giả nhất quán, mỗi file
 * ghi `_source`); bridge và CDN Zalo được giả bằng Http::fake nên contract đo đúng
 * cái driver bắn ra. Hình dạng bộ vàng được khoá bởi ZaloFixtureShapeTest.
 */
final class ZaloHarness implements ChannelHarness
{
    /** Thư mục bộ fixture vàng — mọi loại tin của Zalo đều lấy từ đây. */
    private const REAL = 'zalo/real/';

    /** Fixture thật cho từng năng lực tin đến. */
    private const INBOUND_FIXTURES = [
        // Bản có `listener_data` để driver lưu được ảnh chụp zca — trích dẫn chiều
        // ra của Zalo dựng từ đó (SendMessageQuote cần đủ 6 trường).
        Capability::InboundText->value => 'text',
        Capability::InboundImage->value => 'image',
        Capability::InboundGif->value => 'gif',
        Capability::InboundFile->value => 'file',
        // Hai loại này chưa có bản bắt từ bridge thật; fixture dựng tay cùng hình dạng.
        Capability::InboundVideo->value => '../../zalo_inbound_video',
        Capability::InboundAudio->value => '../../zalo_inbound_audio',
        Capability::InboundSticker->value => 'sticker',
        Capability::InboundLocation->value => 'location',
        Capability::InboundContactCard->value => 'business_card',
        Capability::InboundBankCard->value => 'bank_card',
        Capability::InboundReminder->value => 'reminder_created',
        Capability::GroupThreads->value => 'group_text',
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
        $payload = ChannelFixture::load(self::REAL.$fixture);
        $sourceId = $payload['source_id'].'-'.(++$this->sequence);
        $payload['source_id'] = $sourceId;

        if (isset($payload['listener_data']['msgId'])) {
            $payload['listener_data']['msgId'] = $sourceId;
            $payload['listener_data']['cliMsgId'] = $payload['listener_data']['cliMsgId'].$this->sequence;
        }

        $this->dispatch($payload);

        return Message::query()->where('source_id', $sourceId)->firstOrFail();
    }

    public function receiveReply(Message $quoted): Message
    {
        $payload = ChannelFixture::load(self::REAL.'quote');
        $sourceId = $payload['source_id'].'-'.(++$this->sequence);
        $payload['source_id'] = $sourceId;
        $payload['quote_msg_id'] = $quoted->source_id;
        $payload['quote']['msg_id'] = $quoted->source_id;

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
        $payload = ChannelFixture::load(self::REAL.match ($capability) {
            Capability::EventSeen => 'seen',
            Capability::EventDelivered => 'delivered',
            Capability::EventReaction => 'reaction',
            Capability::EventRecall => 'undo',
            default => throw new LogicException("Zalo chưa có fixture sự kiện cho {$capability->value}"),
        });

        // Biên nhận đi theo lô (payload[0] là MẢNG), còn reaction/undo là một sự
        // kiện đơn — hai hình dạng khác nhau nên phải trỏ đích ở đúng chỗ.
        match ($capability) {
            Capability::EventSeen, Capability::EventDelivered => $payload['payload'][0][0]['data']['msgId'] = $target->source_id,
            Capability::EventReaction => $payload['payload'][0]['data']['content']['rMsg'][0]['gMsgID'] = $target->source_id,
            Capability::EventRecall => $payload['payload'][0]['data']['content']['globalMsgId'] = $target->source_id,
            default => null,
        };

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
            // Closure: mỗi request một thân mới, ảnh đại diện không đọc cạn stream của ảnh tin.
            'cdn.zalo.test/*' => fn () => Http::response('binary-image', 200, ['Content-Type' => 'image/jpeg']),
            '*/personal-messages/send' => Http::response(['ok' => true, 'source_id' => 'contract-sent-'.uniqid()]),
            '*/personal-messages/stickers/*' => Http::response(['ok' => true, 'stickers' => [$this->catalogSticker()]]),
            '*' => Http::response(['ok' => true]),
        ]);
    }

    /**
     * Danh mục sticker trả đúng sticker của bộ vàng — bộ ghi ở `catId` như payload
     * thật, bridge đổi sang `cate_id` khi trả danh mục.
     *
     * @return array<string, mixed>
     */
    private function catalogSticker(): array
    {
        $sticker = ChannelFixture::load(self::REAL.'sticker')['sticker'];

        return [
            'id' => $sticker['id'],
            'cate_id' => $sticker['catId'],
            'type' => $sticker['type'],
            'url' => $sticker['url'],
            'label' => null,
        ];
    }
}
