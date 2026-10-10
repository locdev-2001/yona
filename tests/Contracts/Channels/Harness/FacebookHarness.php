<?php

namespace Tests\Contracts\Channels\Harness;

use App\Channels\Capability;
use App\Jobs\Webhooks\FacebookMessageEventsJob;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Facebook\MessageCreator;
use App\Services\Facebook\MessageParser;
use App\Services\Facebook\SendOnFacebookService;
use Illuminate\Support\Facades\Http;
use LogicException;
use Tests\Feature\Channels\ChannelFixture;

/**
 * Messenger trong khung contract: một phần tử `messaging` dựng từ fixture
 * facebook_messaging, Graph API và CDN được giả bằng Http::fake.
 */
final class FacebookHarness implements ChannelHarness
{
    private const PAGE_ID = 'page-id';

    private const CONTACT_PSID = 'sender-psid';

    /** @var array<string, array<string, mixed>> phần `message` cho từng năng lực tin đến */
    private const INBOUND_MESSAGES = [
        Capability::InboundText->value => ['text' => 'Xin chào từ Messenger'],
        Capability::InboundImage->value => ['attachments' => [['type' => 'image', 'payload' => ['url' => 'https://cdn.messenger.test/anh.jpg']]]],
        Capability::InboundVideo->value => ['attachments' => [['type' => 'video', 'payload' => ['url' => 'https://cdn.messenger.test/clip.mp4']]]],
        Capability::InboundAudio->value => ['attachments' => [['type' => 'audio', 'payload' => ['url' => 'https://cdn.messenger.test/ghi-am.mp4']]]],
        Capability::InboundFile->value => ['attachments' => [['type' => 'file', 'payload' => ['url' => 'https://cdn.messenger.test/bao-gia.pdf']]]],
        Capability::InboundSticker->value => ['attachments' => [['type' => 'image', 'payload' => ['url' => 'https://cdn.messenger.test/sticker.webp', 'sticker_id' => 369239263222822]]]],
    ];

    private ?Conversation $conversation = null;

    private int $sequence = 0;

    public function __construct(private readonly Inbox $inbox)
    {
        $this->inbox->channel->update(['page_id' => self::PAGE_ID]);
        $this->fakeGraph();
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
        $message = self::INBOUND_MESSAGES[$capability->value]
            ?? throw new LogicException("Messenger chưa có payload cho {$capability->value}");

        return $this->dispatchMessage($message);
    }

    public function receiveReply(Message $quoted): Message
    {
        return $this->dispatchMessage(['text' => 'hỏi lại', 'reply_to' => ['mid' => $quoted->source_id]]);
    }

    public function sendOutbound(Message $message): OutboundAttempt
    {
        $this->fakeGraph();

        (new SendOnFacebookService($message))->perform();

        $payloads = Http::recorded()
            ->filter(fn (array $pair) => str_contains($pair[0]->url(), '/me/messages'))
            ->map(fn (array $pair) => $pair[0]->data())
            ->values()
            ->all();

        return new OutboundAttempt($message->fresh(), $payloads);
    }

    public function receiveEvent(Capability $capability, Message $target): void
    {
        $event = match ($capability) {
            Capability::EventDelivered => ['delivery' => ['mids' => [$target->source_id], 'watermark' => now()->getTimestampMs()]],
            Capability::EventSeen => ['read' => ['watermark' => now()->addMinute()->getTimestampMs()]],
            Capability::EventReaction => ['reaction' => ['mid' => $target->source_id, 'action' => 'react', 'emoji' => '❤️', 'reaction' => 'love']],
            default => throw new LogicException("Messenger chưa có sự kiện cho {$capability->value}"),
        };

        (new FacebookMessageEventsJob($this->messaging($event)))->handle();
    }

    /** @param array<string, mixed> $message */
    private function dispatchMessage(array $message): Message
    {
        $mid = 'mid.contract.'.(++$this->sequence);
        $messaging = $this->messaging(['message' => ['mid' => $mid, ...$message]]);

        (new MessageCreator(new MessageParser($messaging)))->perform();

        return Message::query()->where('source_id', $mid)->firstOrFail();
    }

    /** @param array<string, mixed> $extra */
    private function messaging(array $extra): array
    {
        return [
            ...ChannelFixture::load('facebook_messaging')['entry'][0]['messaging'][0],
            'sender' => ['id' => self::CONTACT_PSID],
            'recipient' => ['id' => self::PAGE_ID],
            'timestamp' => now()->getTimestampMs(),
            ...$extra,
        ];
    }

    private function fakeGraph(): void
    {
        Http::fake([
            'cdn.messenger.test/*' => fn () => Http::response(ChannelFixture::jpegBytes(), 200, ['Content-Type' => 'image/jpeg']),
            'graph.facebook.com/*/me/messages' => fn () => Http::response(['message_id' => 'mid.sent.'.uniqid()]),
            'graph.facebook.com/*' => Http::response(['name' => 'Khách Messenger', 'profile_pic' => 'https://cdn.messenger.test/avatar.jpg']),
        ]);
    }
}
