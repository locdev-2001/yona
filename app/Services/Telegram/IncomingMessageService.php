<?php

namespace App\Services\Telegram;

use App\Builders\ContactInboxWithContactBuilder;
use App\Jobs\Avatar\AvatarFromUrlJob;
use App\Messaging\Delivery\ChoiceToken;
use App\Models\Attachment;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Channels\IncomingConversationResolver;
use App\Services\Channels\RemoteAttachmentDownloader;
use App\Services\Messaging\ChoiceCallbackService;

/**
 * Bản gốc không hỗ trợ chat nhóm nên chỉ nhận chat riêng tư.
 */
class IncomingMessageService
{
    use ParamHelpers;

    private ?ContactInbox $contactInbox = null;

    private ?Contact $contact = null;

    private ?Conversation $conversation = null;

    private ?Message $message = null;

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

        $this->setContact();

        if ($this->contactInbox === null) {
            return null;
        }

        $this->updateContactAvatar();
        $this->conversation = IncomingConversationResolver::resolve($this->contactInbox, [
            'chat_id' => $this->chatId(),
            'business_connection_id' => $this->businessConnectionId(),
        ]);

        $isOutgoing = $this->isBusinessMessageOutgoing();

        $this->message = $this->conversation->messages()->make([
            'content' => $this->messageContent(),
            'account_id' => $this->inbox->account_id,
            'inbox_id' => $this->inbox->id,
            'message_type' => $isOutgoing ? Message::TYPE_OUTGOING : Message::TYPE_INCOMING,
            'content_type' => $this->isStickerMessage() ? Message::CONTENT_TYPES['sticker'] : Message::CONTENT_TYPES['text'],
            'content_attributes' => [...$this->contentAttributes(), ...$this->stickerAttributes()],
            'source_id' => (string) $this->messageId(),
        ]);

        if (! $isOutgoing) {
            $this->message->sender()->associate($this->contact);
        }

        // Gốc gắn đính kèm TRƯỚC `save!` (`process_message_attachments` rồi mới
        // `@message.save!`, incoming_message_service.rb:34-35) nên `message.created`
        // phát ra đã có đính kèm; gắn sau khi lưu thì payload realtime rỗng và
        // bong bóng chỉ hiện lại sau khi tải lại trang.
        if ($this->hasMessageParams()) {
            $this->processMessageAttachments();
        }

        $this->message->save();

        return $this->message;
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

    private function setContact(): void
    {
        $this->contactInbox = (new ContactInboxWithContactBuilder(
            inbox: $this->inbox,
            contactAttributes: [
                'name' => trim(($this->contactParams()['first_name'] ?? '').' '.($this->contactParams()['last_name'] ?? '')),
                'additional_attributes' => [
                    'username' => $this->contactParams()['username'] ?? null,
                    'language_code' => $this->contactParams()['language_code'] ?? null,
                    'social_telegram_user_id' => $this->fromId(),
                    'social_telegram_user_name' => $this->contactParams()['username'] ?? null,
                ],
            ],
            sourceId: (string) $this->fromId(),
        ))->perform();

        $this->contact = $this->contactInbox?->contact;
    }

    private function updateContactAvatar(): void
    {
        if ($this->contact === null || filled($this->contact->avatar)) {
            return;
        }

        $avatarUrl = (new TelegramClient($this->inbox->channel))->profileImageUrl((string) $this->fromId());

        if ($avatarUrl) {
            AvatarFromUrlJob::dispatch($this->contact, $avatarUrl);
        }
    }

    private function processMessageAttachments(): void
    {
        $this->attachLocation();
        $this->attachFile();
        $this->attachContactCard();
    }

    private function attachFile(): void
    {
        $file = $this->file();

        if ($file === null) {
            return;
        }

        $downloadUrl = (new TelegramClient($this->inbox->channel))->filePath((string) $file['file_id']);

        if (blank($downloadUrl)) {
            return;
        }

        $attributes = RemoteAttachmentDownloader::download(
            url: $downloadUrl,
            accountId: $this->message->account_id,
            filename: $file['file_name'] ?? null,
        );

        if ($attributes === null) {
            // URL tệp của Telegram nhúng bot token nên KHÔNG được đẩy ra trình
            // duyệt: fallback chỉ giữ tên tệp để agent biết khách đã gửi gì.
            $this->message->pendingAttachments[] = new Attachment(
                RemoteAttachmentDownloader::fallbackAttributes($this->message->account_id, $file['file_name'] ?? null),
            );

            return;
        }

        $attributes['file_type'] = $this->fileContentType($attributes['content_type']);
        $this->message->pendingAttachments[] = new Attachment($attributes);
    }

    private function attachLocation(): void
    {
        $location = data_get($this->params, 'message.location');

        if (blank($location)) {
            return;
        }

        $this->message->pendingAttachments[] = new Attachment([
            'account_id' => $this->message->account_id,
            'file_type' => Attachment::FILE_TYPE_LOCATION,
            'fallback_title' => data_get($this->params, 'message.venue.title', ''),
            'coordinates_lat' => $location['latitude'],
            'coordinates_long' => $location['longitude'],
        ]);
    }

    private function attachContactCard(): void
    {
        $card = data_get($this->params, 'message.contact');

        if (blank($card)) {
            return;
        }

        $this->message->pendingAttachments[] = new Attachment([
            'account_id' => $this->message->account_id,
            'file_type' => Attachment::FILE_TYPE_CONTACT,
            'fallback_title' => (string) ($card['phone_number'] ?? ''),
            'meta' => [
                'first_name' => $card['first_name'] ?? null,
                'last_name' => $card['last_name'] ?? null,
            ],
        ]);
    }

    private function fileContentType(?string $contentType): int
    {
        if ($this->isImageMessage()) {
            return Attachment::FILE_TYPE_IMAGE;
        }

        if ($this->isAudioMessage()) {
            return Attachment::FILE_TYPE_AUDIO;
        }

        if ($this->isVideoMessage()) {
            return Attachment::FILE_TYPE_VIDEO;
        }

        return Attachment::fileTypeFor($contentType);
    }

    private function isImageMessage(): bool
    {
        return filled(data_get($this->params, 'message.photo')) || $this->isStickerMessage();
    }

    private function isStickerMessage(): bool
    {
        return $this->hasMessageParams() && filled(data_get($this->params, 'message.sticker'));
    }

    /**
     * Sticker vào contract lõi như Zalo (`content_type` sticker + `content_attributes.sticker`).
     * Không có `url`: URL tệp Telegram nhúng bot token nên ảnh chỉ đi qua đính kèm đã tải về.
     *
     * @return array<string, array<string, mixed>>
     */
    private function stickerAttributes(): array
    {
        if (! $this->isStickerMessage()) {
            return [];
        }

        $sticker = (array) data_get($this->params, 'message.sticker');

        return ['sticker' => array_filter([
            'id' => $sticker['file_unique_id'] ?? $sticker['file_id'] ?? null,
            'cateId' => $sticker['set_name'] ?? null,
            'emoji' => $sticker['emoji'] ?? null,
        ], fn ($value) => filled($value))];
    }

    private function isAudioMessage(): bool
    {
        return filled(data_get($this->params, 'message.voice')) || filled(data_get($this->params, 'message.audio'));
    }

    private function isVideoMessage(): bool
    {
        return filled(data_get($this->params, 'message.video')) || filled(data_get($this->params, 'message.video_note'));
    }

    /** @return array<string, mixed>|null */
    private function file(): ?array
    {
        $photos = data_get($this->params, 'message.photo');
        $candidates = [
            filled($photos) ? end($photos) : null,
            data_get($this->params, 'message.sticker.thumb'),
            data_get($this->params, 'message.video'),
            data_get($this->params, 'message.video_note'),
            data_get($this->params, 'message.voice'),
            data_get($this->params, 'message.audio'),
            data_get($this->params, 'message.document'),
        ];

        foreach ($candidates as $candidate) {
            if (filled($candidate)) {
                return (array) $candidate;
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
