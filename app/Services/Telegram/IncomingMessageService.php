<?php

namespace App\Services\Telegram;

use App\Messaging\Delivery\ChoiceToken;
use App\Messaging\Inbound\AttachmentKind;
use App\Messaging\Inbound\InboundAttachment;
use App\Messaging\Inbound\InboundDirection;
use App\Messaging\Inbound\InboundMessage;
use App\Messaging\Inbound\InboundMessageWriter;
use App\Messaging\Inbound\InboundSender;
use App\Messaging\Inbound\ReplyReference;
use App\Messaging\Stickers\StickerContent;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Messaging\ChoiceCallbackService;
use Illuminate\Support\Carbon;

/**
 * Bóc một update của Bot API thành tin của lõi. Chỉ nhận chat riêng tư (bản gốc không
 * hỗ trợ nhóm). URL tệp của Telegram nhúng bot token nên mọi tệp đều tải về, không
 * bao giờ đưa URL ra trình duyệt.
 */
class IncomingMessageService
{
    use ParamHelpers;

    /** @var array<string, string> khoá tệp trong `message` → loại đính kèm của lõi, theo thứ tự ưu tiên */
    private const FILE_KINDS = [
        'video' => 'video',
        'video_note' => 'video',
        'voice' => 'voice',
        'audio' => 'audio',
        'document' => 'file',
    ];

    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly Inbox $inbox,
        private array $params,
    ) {}

    public function perform(): ?Message
    {
        if ($this->isCallbackQuery()) {
            return $this->handleCallbackQuery();
        }

        $this->transformBusinessMessage();

        if (! $this->isPrivateMessage()) {
            return null;
        }

        return app(InboundMessageWriter::class)->write($this->inbox, $this->sender(), $this->inboundMessage());
    }

    // Khách bấm nút chip do DeliveryPlanner vẽ (Renderers\TelegramRenderer): map thẳng về
    // tin gốc qua SubmissionService, không tạo tin đến mang callback_data thô.
    private function handleCallbackQuery(): ?Message
    {
        $parsed = ChoiceToken::parseTelegram((string) data_get($this->params, 'callback_query.data'));

        if ($parsed === null) {
            return null;
        }

        return app(ChoiceCallbackService::class)->resolve(
            messageId: $parsed['message_id'],
            value: $parsed['value'] ?? null,
            index: $parsed['index'] ?? null,
            inboxId: $this->inbox->id,
            senderSourceId: (string) data_get($this->params, 'callback_query.from.id'),
        );
    }

    private function sender(): InboundSender
    {
        $from = $this->contactParams();
        $sourceId = (string) $this->fromId();

        return new InboundSender(
            sourceId: $sourceId,
            name: trim(($from['first_name'] ?? '').' '.($from['last_name'] ?? '')) ?: null,
            // getUserProfilePhotos là một lượt gọi API: chỉ tra cho khách mới.
            avatarUrl: $this->isNewContact($sourceId) ? (new TelegramClient($this->inbox->channel))->profileImageUrl($sourceId) : null,
            additionalAttributes: [
                'username' => $from['username'] ?? null,
                'language_code' => $from['language_code'] ?? null,
                'social_telegram_user_id' => $this->fromId(),
                'social_telegram_user_name' => $from['username'] ?? null,
            ],
        );
    }

    private function isNewContact(string $sourceId): bool
    {
        return $this->inbox->contactInboxes()->where('source_id', $sourceId)->doesntExist();
    }

    private function inboundMessage(): InboundMessage
    {
        $replyExternalId = data_get($this->params, 'message.reply_to_message.message_id');
        $date = data_get($this->params, 'message.date');

        return new InboundMessage(
            sourceId: (string) $this->messageId(),
            direction: $this->isBusinessMessageOutgoing() ? InboundDirection::Echo : InboundDirection::Incoming,
            text: $this->messageContent(),
            sentAt: is_numeric($date) ? Carbon::createFromTimestamp((int) $date) : null,
            sticker: $this->sticker(),
            attachments: $this->hasMessageParams() ? $this->attachments() : [],
            replyTo: filled($replyExternalId) ? new ReplyReference((string) $replyExternalId) : null,
            forwardedFrom: $this->forwardedFrom(),
            conversationAttributes: [
                'chat_id' => $this->chatId(),
                'business_connection_id' => $this->businessConnectionId(),
            ],
        );
    }

    /** @return list<InboundAttachment> */
    private function attachments(): array
    {
        $specs = [];
        $location = data_get($this->params, 'message.location');

        if (filled($location)) {
            $specs[] = InboundAttachment::location(
                (float) $location['latitude'],
                (float) $location['longitude'],
                data_get($this->params, 'message.venue.title'),
            );
        }

        $file = $this->file();

        if ($file !== null) {
            $specs[] = $this->fileAttachment($file['data'], $file['kind']);
        }

        $card = data_get($this->params, 'message.contact');

        if (filled($card)) {
            $specs[] = InboundAttachment::contactCard((string) ($card['phone_number'] ?? ''), [
                'first_name' => $card['first_name'] ?? null,
                'last_name' => $card['last_name'] ?? null,
            ]);
        }

        return $specs;
    }

    /** @param array<string, mixed> $file */
    private function fileAttachment(array $file, AttachmentKind $kind): InboundAttachment
    {
        $downloadUrl = (new TelegramClient($this->inbox->channel))->filePath((string) $file['file_id']);

        if (blank($downloadUrl)) {
            return InboundAttachment::fallback($file['file_name'] ?? null);
        }

        return InboundAttachment::download((string) $downloadUrl, $kind, $file['file_name'] ?? null, urlIsPublic: false);
    }

    /** Không có `url`: ảnh sticker chỉ đi qua đính kèm đã tải về (thumb). */
    private function sticker(): ?StickerContent
    {
        $sticker = data_get($this->params, 'message.sticker');

        if (! $this->hasMessageParams() || blank($sticker)) {
            return null;
        }

        return new StickerContent(
            id: (string) ($sticker['file_unique_id'] ?? $sticker['file_id']),
            packId: $sticker['set_name'] ?? null,
            animated: isset($sticker['is_animated']) ? (bool) $sticker['is_animated'] : null,
            emoji: $sticker['emoji'] ?? null,
        );
    }

    /** @return array{data: array<string, mixed>, kind: AttachmentKind}|null */
    private function file(): ?array
    {
        $photos = data_get($this->params, 'message.photo');

        if (filled($photos)) {
            return ['data' => (array) end($photos), 'kind' => AttachmentKind::Image];
        }

        $stickerThumb = data_get($this->params, 'message.sticker.thumb');

        if (filled($stickerThumb)) {
            return ['data' => (array) $stickerThumb, 'kind' => AttachmentKind::Image];
        }

        foreach (self::FILE_KINDS as $key => $kind) {
            $candidate = data_get($this->params, "message.{$key}");

            if (filled($candidate)) {
                return ['data' => (array) $candidate, 'kind' => AttachmentKind::from($kind)];
            }
        }

        return null;
    }

    private function transformBusinessMessage(): void
    {
        if (filled($this->params['business_message'] ?? null) && blank($this->params['message'] ?? null)) {
            $this->params['message'] = $this->params['business_message'];
        }
    }
}
