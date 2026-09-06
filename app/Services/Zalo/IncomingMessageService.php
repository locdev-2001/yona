<?php

namespace App\Services\Zalo;

use App\Builders\ContactInboxWithContactBuilder;
use App\Models\Attachment;
use App\Models\ContactInbox;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Channels\IncomingConversationResolver;
use App\Services\Channels\RemoteAttachmentDownloader;

/**
 * Sự kiện `inbound` của bridge → liên hệ + hội thoại + tin nhắn. Port gộp từ
 * ZaloChannelDriver::parseInbound + IntakeService của nhánh `main`, viết lại theo
 * khuôn incoming service của các kênh F2–F5 (Telegram/Line/Tiktok).
 *
 * Chống trùng liên hệ: khóa chính là SỐ ĐIỆN THOẠI (CLAUDE.md) — số nằm trong
 * payload thì đưa vào builder, builder tự gộp về hồ sơ đã có.
 */
class IncomingMessageService
{
    /** @var array<string, int> */
    private const ATTACHMENT_TYPES = [
        'image' => Attachment::FILE_TYPE_IMAGE,
        'gif' => Attachment::FILE_TYPE_IMAGE,
        'video' => Attachment::FILE_TYPE_VIDEO,
        'audio' => Attachment::FILE_TYPE_AUDIO,
        'file' => Attachment::FILE_TYPE_FILE,
    ];

    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly Inbox $inbox,
        private readonly array $params,
    ) {}

    public function perform(): ?Message
    {
        $threadUid = (string) ($this->params['peer_uid'] ?? $this->params['thread_id'] ?? '');

        if ($threadUid === '') {
            return null;
        }

        $contactInbox = $this->resolveContactInbox($threadUid);

        if ($contactInbox === null) {
            return null;
        }

        $conversation = IncomingConversationResolver::resolve($contactInbox, [
            'thread_id' => $threadUid,
            'thread_type' => (int) ($this->params['thread_type'] ?? 0),
        ]);

        $sourceId = isset($this->params['source_id']) ? (string) $this->params['source_id'] : null;

        if ($sourceId !== null && $conversation->messages()->where('source_id', $sourceId)->exists()) {
            return null;
        }

        $isOutgoing = $this->direction() !== 'in';

        $message = $conversation->messages()->make([
            'content' => $this->content(),
            'account_id' => $this->inbox->account_id,
            'inbox_id' => $this->inbox->id,
            'message_type' => $isOutgoing ? Message::TYPE_OUTGOING : Message::TYPE_INCOMING,
            'content_attributes' => $this->contentAttributes(),
            'source_id' => $sourceId,
        ]);

        if (! $isOutgoing) {
            $message->sender()->associate($contactInbox->contact);
        }

        $message->save();

        $this->attachMedia($message);

        return $message;
    }

    private function resolveContactInbox(string $threadUid): ?ContactInbox
    {
        $user = is_array($this->params['user'] ?? null) ? $this->params['user'] : [];

        return (new ContactInboxWithContactBuilder(
            inbox: $this->inbox,
            contactAttributes: [
                'name' => $user['name'] ?? null,
                'phone_number' => $this->phoneNumber(),
                'avatar_url' => $user['avatar'] ?? null,
                'additional_attributes' => array_filter([
                    'social_zalo_user_id' => $threadUid,
                    'social_zalo_user_name' => $user['name'] ?? null,
                ]),
            ],
            sourceId: $threadUid,
        ))->perform();
    }

    /**
     * Bridge không gửi số ở tin thường; danh thiếp Zalo (`business_card`) có số —
     * đó cũng là lúc luật chống trùng theo số điện thoại phát huy tác dụng.
     */
    private function phoneNumber(): ?string
    {
        $phone = $this->params['user']['phone'] ?? $this->params['business_card']['phone'] ?? null;

        return blank($phone) ? null : (string) $phone;
    }

    private function direction(): string
    {
        $direction = $this->params['direction'] ?? 'in';

        // Thiếu/lạ → coi là tin đến: thà đếm thiếu tin tenant gửi còn hơn đếm nhầm.
        return in_array($direction, ['in', 'out', 'echo'], true) ? $direction : 'in';
    }

    private function content(): ?string
    {
        $content = $this->params['content'] ?? null;

        return blank($content) ? null : (string) $content;
    }

    /** @return array<string, mixed> */
    private function contentAttributes(): array
    {
        $attributes = [];

        foreach (['sticker', 'business_card', 'call'] as $key) {
            if (filled($this->params[$key] ?? null)) {
                $attributes[$key] = $this->params[$key];
            }
        }

        $quote = $this->params['quote'] ?? null;

        if (filled($quote)) {
            $attributes['quote'] = $quote;
            $quotedId = $quote['msgId'] ?? $quote['source_id'] ?? null;

            if (filled($quotedId)) {
                $attributes['in_reply_to_external_id'] = (string) $quotedId;
            }
        }

        if ($this->direction() === 'echo') {
            // Tin do chính điện thoại/CRM đẩy lại — đánh dấu để không gửi ngược ra kênh.
            $attributes['external_echo'] = true;
        }

        return $attributes;
    }

    private function attachMedia(Message $message): void
    {
        $url = $this->params['media_url'] ?? null;

        if (blank($url)) {
            return;
        }

        $attributes = RemoteAttachmentDownloader::download(
            url: (string) $url,
            accountId: $message->account_id,
            filename: $this->params['media_filename'] ?? null,
        );

        if ($attributes === null) {
            return;
        }

        $kind = (string) ($this->params['inbound_kind'] ?? 'file');
        $attributes['file_type'] = self::ATTACHMENT_TYPES[$kind] ?? Attachment::fileTypeFor($attributes['content_type']);

        $message->attachments()->create($attributes);
    }
}
