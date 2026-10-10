<?php

use App\Messaging\Inbound\AttachmentKind;
use App\Messaging\Inbound\Events\RecallEvent;
use App\Messaging\Inbound\ForwardOrigin;
use App\Messaging\Inbound\InboundAttachment;
use App\Messaging\Inbound\InboundDirection;
use App\Messaging\Inbound\InboundMessage;
use App\Messaging\Inbound\InboundMessageWriter;
use App\Messaging\Inbound\InboundSender;
use App\Messaging\Inbound\MessageEventService;
use App\Messaging\Inbound\ReplyReference;
use App\Messaging\Stickers\StickerContent;
use App\Messaging\Stickers\StickerMessage;
use App\Models\Attachment;
use App\Models\Inbox;
use App\Models\Message;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\Feature\Channels\ChannelFixture;

beforeEach(function () {
    Storage::fake('public');
    $this->inbox = Inbox::factory()->line()->create();
    $this->writer = app(InboundMessageWriter::class);
    $this->sender = new InboundSender(sourceId: 'khach-1', name: 'Nguyễn An', avatarUrl: null);
});

function writeInbound(Inbox $inbox, InboundSender $sender, InboundMessage $message): ?Message
{
    return app(InboundMessageWriter::class)->write($inbox, $sender, $message);
}

it('tin chữ: tạo liên hệ, hội thoại và tin đến có người gửi', function () {
    $message = writeInbound($this->inbox, $this->sender, new InboundMessage(sourceId: 'm1', text: 'Xin chào'));

    expect($message)->not->toBeNull()
        ->and($message->message_type)->toBe(Message::TYPE_INCOMING)
        ->and($message->status)->toBe(Message::STATUSES['sent'])
        ->and($message->content)->toBe('Xin chào')
        ->and($message->sender_id)->toBe($message->conversation->contact_id)
        ->and($message->conversation->contact->name)->toBe('Nguyễn An')
        ->and($message->conversation->contactInbox->source_id)->toBe('khach-1');
});

it('trùng source_id trong cùng inbox thì bỏ qua', function () {
    writeInbound($this->inbox, $this->sender, new InboundMessage(sourceId: 'm1', text: 'a'));

    expect(writeInbound($this->inbox, $this->sender, new InboundMessage(sourceId: 'm1', text: 'a')))->toBeNull()
        ->and(Message::query()->count())->toBe(1);
});

it('tin dội lại: tin đi đã giao, mang external_echo, không gán người gửi là khách', function () {
    $message = writeInbound($this->inbox, $this->sender, new InboundMessage(sourceId: 'e1', direction: InboundDirection::Echo, text: 'Shop trả lời'));

    expect($message->message_type)->toBe(Message::TYPE_OUTGOING)
        ->and($message->status)->toBe(Message::STATUSES['delivered'])
        ->and($message->content_attributes['external_echo'])->toBeTrue()
        ->and($message->sender_id)->toBeNull();
});

it('trích dẫn: lõi suy in_reply_to nội bộ từ id ngoài và giữ ảnh chụp', function () {
    $quoted = writeInbound($this->inbox, $this->sender, new InboundMessage(sourceId: 'q1', text: 'Giá bao nhiêu?'));

    $reply = writeInbound($this->inbox, $this->sender, new InboundMessage(
        sourceId: 'q2',
        text: 'Mình hỏi lại',
        replyTo: new ReplyReference('q1', content: 'Giá bao nhiêu?', senderName: 'Nguyễn An'),
    ));

    expect($reply->content_attributes['in_reply_to_external_id'])->toBe('q1')
        ->and($reply->content_attributes['in_reply_to'])->toBe($quoted->id)
        ->and($reply->content_attributes['in_reply_to_preview'])->toBe(['content' => 'Giá bao nhiêu?', 'sender_name' => 'Nguyễn An']);
});

it('chuyển tiếp và khoá riêng của kênh đi nguyên vào content_attributes', function () {
    $message = writeInbound($this->inbox, $this->sender, new InboundMessage(
        sourceId: 'f1',
        text: 'nội dung được chuyển tiếp',
        forwardedFrom: new ForwardOrigin('Người lạ'),
        attributes: ['referral' => ['source' => 'ADS']],
    ));

    expect($message->content_attributes['forwarded_from'])->toBe(['origin' => 'channel', 'sender_name' => 'Người lạ'])
        ->and($message->content_attributes['referral'])->toBe(['source' => 'ADS'])
        ->and($message->isForwarded())->toBeTrue();
});

it('đính kèm dựng trước khi lưu và đi theo tin', function () {
    Http::fake(['cdn.test/*' => Http::response(ChannelFixture::jpegBytes(), 200, ['Content-Type' => 'image/jpeg'])]);

    $message = writeInbound($this->inbox, $this->sender, new InboundMessage(
        sourceId: 'a1',
        text: 'ảnh và vị trí',
        attachments: [
            InboundAttachment::download('https://cdn.test/a.jpg', AttachmentKind::Image),
            InboundAttachment::location(10.0, 106.0, 'Nhà'),
        ],
    ));

    expect($message->attachments)->toHaveCount(2)
        ->and($message->attachments[0]->file_type)->toBe(Attachment::FILE_TYPE_IMAGE)
        ->and($message->attachments[1]->file_type)->toBe(Attachment::FILE_TYPE_LOCATION);
});

it('sticker cần tải: ảnh tải về trở thành ảnh sticker, không còn đính kèm nào khác', function () {
    Http::fake(['cdn.test/*' => Http::response(ChannelFixture::jpegBytes(), 200, ['Content-Type' => 'image/webp'])]);

    $message = writeInbound($this->inbox, $this->sender, new InboundMessage(
        sourceId: 's1',
        sticker: new StickerContent(id: '77'),
        attachments: [InboundAttachment::download('https://cdn.test/s.webp', AttachmentKind::Image)],
    ));

    expect(StickerMessage::isSticker($message))->toBeTrue()
        ->and($message->content)->toBeNull()
        ->and($message->attachments)->toHaveCount(1)
        ->and($message->content_attributes['sticker']['id'])->toBe('77');
});

it('giờ nền tảng vào platform_sent_at để xếp thứ tự; created_at vẫn là giờ nhận nên tin trễ vẫn tính chưa đọc', function () {
    $first = writeInbound($this->inbox, $this->sender, new InboundMessage(sourceId: 't0', text: 'đến trước', sentAt: now()->subMinute()));
    $this->inbox->conversations()->update(['agent_last_seen_at' => now()]);
    // Cùng giây với tin đầu thì không phân biệt được; nhích đồng hồ cho hai tin sau.
    $this->travelTo(now()->addSeconds(5));
    $late = writeInbound($this->inbox, $this->sender, new InboundMessage(sourceId: 't1', text: 'gửi hôm qua, webhook tới giờ', sentAt: now()->subDay()));
    $future = writeInbound($this->inbox, $this->sender, new InboundMessage(sourceId: 't2', text: 'đồng hồ chạy trước', sentAt: now()->addDay()));

    expect($late->platform_sent_at->isSameDay(now()->subDay()))->toBeTrue()
        ->and($late->created_at->isSameDay(now()))->toBeTrue()
        ->and($future->platform_sent_at->isSameDay(now()))->toBeTrue()
        ->and($first->conversation->messages()->pluck('id')->all())->toBe([$late->id, $first->id, $future->id])
        ->and($first->conversation->fresh()->unreadIncomingMessagesCount())->toBe(2);
});

it('sticker tải ảnh hỏng vẫn giữ đính kèm fallback để tin còn hiện và còn đường tải lại', function () {
    Http::fake(['cdn.test/*' => Http::response('', 500)]);

    $message = writeInbound($this->inbox, $this->sender, new InboundMessage(
        sourceId: 's2',
        sticker: new StickerContent(id: '78'),
        attachments: [InboundAttachment::download('https://cdn.test/s.webp', AttachmentKind::Image)],
    ));

    expect(StickerMessage::isSticker($message))->toBeTrue()
        ->and($message->attachments)->toHaveCount(1)
        ->and($message->attachments->first()->file_type)->toBe(Attachment::FILE_TYPE_FALLBACK);
});

it('thu hồi tới trước tin thì tin vừa ghi bị đánh dấu xoá ngay', function () {
    app(MessageEventService::class)->apply($this->inbox, new RecallEvent('late-1'));

    $message = writeInbound($this->inbox, $this->sender, new InboundMessage(sourceId: 'late-1', text: 'tin tới trễ'));

    expect($message->fresh()->isDeleted())->toBeTrue();
});
