<?php

namespace App\Services\Messages\Forwarding;

use App\Channels\Capability;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\Channels\ChannelActionRegistry;
use Illuminate\Support\Collection;

/**
 * Luật DUY NHẤT của chuyển tiếp: tin nào chuyển tiếp được, và hội thoại đích nào
 * nhận được nó. Đích được gate bằng các năng lực `outbound_*` sẵn có của hộp thư
 * đích — chuyển tiếp là tạo một tin mới ở đó, không phải năng lực riêng của kênh.
 */
final class ForwardRequirements
{
    public const FORWARDABLE_CONTENT_TYPES = ['text', 'incoming_email', 'sticker'];

    /** Thẻ đặc thù: nội dung thật nằm trong thẻ, `content` chỉ là nhãn → gửi lại thành chữ là sai nghĩa. */
    public const UNFORWARDABLE_CARD_KEYS = ['business_card', 'bank_card', 'reminder', 'call', 'friend_request'];

    private const FORWARDABLE_MESSAGE_TYPES = [Message::TYPE_INCOMING, Message::TYPE_OUTGOING];

    /** @var array<int, Capability> file_type → năng lực hộp thư đích cần có */
    private const ATTACHMENT_CAPABILITIES = [
        Attachment::FILE_TYPE_IMAGE => Capability::OutboundImage,
        Attachment::FILE_TYPE_VIDEO => Capability::OutboundVideo,
        Attachment::FILE_TYPE_AUDIO => Capability::OutboundAudio,
        Attachment::FILE_TYPE_FILE => Capability::OutboundFile,
    ];

    /** Null = được. $target null = chỉ xét tin nguồn. $locale = locale account để dịch câu lỗi. */
    public static function check(Message $source, ?Conversation $target, ?string $locale): ?ForwardBlock
    {
        $sourceBlock = self::sourceBlock($source, $locale);

        if ($sourceBlock !== null || $target === null) {
            return $sourceBlock;
        }

        return self::targetBlock($source, $target, $locale);
    }

    /**
     * Năng lực hộp thư đích phải có để nhận bản chuyển tiếp của tin này.
     *
     * @return list<Capability> theo thứ tự enum, không trùng
     */
    public static function capabilitiesFor(Message $source): array
    {
        if (self::isSticker($source)) {
            return [Capability::OutboundSticker];
        }

        $required = array_map(
            fn (Attachment $attachment) => self::ATTACHMENT_CAPABILITIES[$attachment->file_type],
            self::forwardableAttachments($source),
        );

        if (filled($source->content)) {
            $required[] = Capability::OutboundText;
        }

        return array_values(array_filter(Capability::cases(), fn (Capability $capability) => in_array($capability, $required, true)));
    }

    /**
     * Đính kèm sẽ được sao sang bản chuyển tiếp. Sticker mang ảnh của chính nó
     * theo danh mục của kênh đích, nên không sao ảnh đính kèm.
     *
     * @return list<Attachment> theo id tăng dần
     */
    public static function forwardableAttachments(Message $source): array
    {
        if (self::isSticker($source)) {
            return [];
        }

        return self::attachmentsOf($source)
            ->filter(fn (Attachment $attachment) => isset(self::ATTACHMENT_CAPABILITIES[$attachment->file_type]) && $attachment->hasFile())
            ->values()
            ->all();
    }

    public static function attachmentUnavailable(Attachment $attachment, ?string $locale): ForwardBlock
    {
        return ForwardBlock::translated(ForwardBlock::ATTACHMENT_UNAVAILABLE, $locale, [
            'filename' => (string) ($attachment->filename ?? $attachment->fallback_title ?? ''),
        ]);
    }

    private static function sourceBlock(Message $source, ?string $locale): ?ForwardBlock
    {
        if (! self::isForwardableKind($source)) {
            return ForwardBlock::translated(ForwardBlock::NOT_FORWARDABLE, $locale);
        }

        if (self::isSticker($source)) {
            return is_array($source->content_attributes['sticker'] ?? null)
                ? null
                : ForwardBlock::translated(ForwardBlock::NOT_FORWARDABLE, $locale);
        }

        foreach (self::attachmentsOf($source) as $attachment) {
            $isMedia = isset(self::ATTACHMENT_CAPABILITIES[$attachment->file_type]);

            if ($attachment->file_type === Attachment::FILE_TYPE_FALLBACK || ($isMedia && ! $attachment->hasFile())) {
                return self::attachmentUnavailable($attachment, $locale);
            }

            if (! $isMedia) {
                return ForwardBlock::translated(ForwardBlock::NOT_FORWARDABLE, $locale);
            }
        }

        return self::capabilitiesFor($source) === []
            ? ForwardBlock::translated(ForwardBlock::NOT_FORWARDABLE, $locale)
            : null;
    }

    private static function targetBlock(Message $source, Conversation $target, ?string $locale): ?ForwardBlock
    {
        $inbox = $target->inbox;
        $missing = array_values(array_filter(
            self::capabilitiesFor($source),
            fn (Capability $capability) => ! $inbox->supports($capability),
        ));

        if ($missing !== []) {
            return ForwardBlock::translated(
                ForwardBlock::CAPABILITY_NOT_SUPPORTED,
                $locale,
                [
                    'inbox' => (string) $inbox->name,
                    'items' => implode(', ', array_map(
                        fn (Capability $capability) => __("errors.forward.capabilities.{$capability->value}", [], $locale),
                        $missing,
                    )),
                ],
                array_map(fn (Capability $capability) => $capability->value, $missing),
            );
        }

        if (self::isSticker($source) && ChannelActionRegistry::stickers($inbox)?->fromStored($source->content_attributes['sticker']) === null) {
            return ForwardBlock::translated(ForwardBlock::STICKER_UNAVAILABLE, $locale, ['inbox' => (string) $inbox->name]);
        }

        return $target->canReply() ? null : ForwardBlock::translated(ForwardBlock::REPLY_WINDOW_CLOSED, $locale);
    }

    private static function isForwardableKind(Message $source): bool
    {
        $contentAttributes = $source->content_attributes ?? [];

        return ! $source->private
            && ! $source->isDeleted()
            && in_array($source->message_type, self::FORWARDABLE_MESSAGE_TYPES, true)
            && in_array($source->contentTypeName(), self::FORWARDABLE_CONTENT_TYPES, true)
            && array_filter(array_intersect_key($contentAttributes, array_flip(self::UNFORWARDABLE_CARD_KEYS))) === [];
    }

    private static function isSticker(Message $source): bool
    {
        return $source->content_type === Message::CONTENT_TYPES['sticker'];
    }

    /** @return Collection<int, Attachment> */
    private static function attachmentsOf(Message $source): Collection
    {
        return $source->attachments->sortBy('id')->values();
    }
}
