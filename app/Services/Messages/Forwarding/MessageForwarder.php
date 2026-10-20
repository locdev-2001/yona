<?php

namespace App\Services\Messages\Forwarding;

use App\Builders\Messages\MessageBuilder;
use App\Exceptions\MessageValidationException;
use App\Messaging\Delivery\PendingDocument;
use App\Models\AgentBot;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\Channels\Stickers\StickerLibrary;
use Throwable;

/**
 * Chuyển tiếp = tạo một tin OUTGOING công khai mới ở hội thoại đích, đi đúng
 * đường MessageBuilder như tin agent gõ tay (gate năng lực, email, realtime, gửi
 * ra kênh). Mỗi đích độc lập: đích này hỏng không làm hỏng đích kia.
 *
 * Dấu `forwarded_from` chỉ mang id nội bộ, không mang tên/SĐT người gửi gốc —
 * content_attributes đi thẳng tới widget của khách và ra webhook.
 */
final class MessageForwarder
{
    public const MAX_TARGETS = 10;

    public const ORIGIN_INTERNAL = 'internal';

    public const ORIGIN_CHANNEL = 'channel';

    /** @throws ForwardException */
    public function forward(Message $source, Conversation $target, User|AgentBot $actor): Message
    {
        $locale = $source->account->locale;
        $block = ForwardRequirements::check($source, $target, $locale);

        if ($block !== null) {
            throw new ForwardException($block);
        }

        $copiedFiles = [];

        try {
            $params = ['content' => $source->content, 'private' => false, 'message_type' => 'outgoing'];
            $attachments = ForwardRequirements::forwardableAttachments($source);
            $asDocument = ForwardRequirements::forwardsAsDocument($source, $target->inbox);

            if ($source->content_type === Message::CONTENT_TYPES['sticker']) {
                $params = [...$params, 'content' => null, 'content_type' => 'sticker', 'sticker_id' => $this->stickerId($source, $target)];
            } elseif ($asDocument) {
                // PDF và tệp của thư dựng ở worker lúc gửi (PendingDocument), người bấm không chờ.
                $params['content'] = null;
                $attachments = [];
            } elseif ($source->content_type === Message::CONTENT_TYPES['incoming_email']) {
                $params['content_type'] = 'incoming_email';
            }

            foreach ($attachments as $attachment) {
                $copy = $attachment->copyStoredFile()
                    ?? throw new ForwardException(ForwardRequirements::attachmentUnavailable($attachment, $locale));
                $copiedFiles[] = $copy;
                $params['attachments'][] = Attachment::signUpload($copy);
            }

            $trustedAttributes = [
                'forwarded_from' => [
                    'origin' => self::ORIGIN_INTERNAL,
                    'message_id' => $source->id,
                    'conversation_id' => $source->conversation->display_id,
                ],
            ];

            if ($asDocument) {
                $trustedAttributes[PendingDocument::KEY] = PendingDocument::emailPdfOf($source);
            } elseif ($source->content_type === Message::CONTENT_TYPES['incoming_email']) {
                $email = data_get($source->content_attributes, 'email');
                if (is_array($email)) {
                    $trustedAttributes['email'] = $email;
                }
            }

            return (new MessageBuilder($actor, $target, $params, trustedContentAttributes: $trustedAttributes))->perform();
        } catch (MessageValidationException $exception) {
            Attachment::discardUnattachedCopies($copiedFiles);

            throw new ForwardException(new ForwardBlock(ForwardBlock::MESSAGE_INVALID, $exception->getMessage()));
        } catch (Throwable $exception) {
            Attachment::discardUnattachedCopies($copiedFiles);

            throw $exception;
        }
    }

    private function stickerId(Message $source, Conversation $target): string
    {
        $sticker = app(StickerLibrary::class)->fromStored($target->inbox, $source->content_attributes['sticker']);

        return $sticker?->id
            ?? throw new ForwardException(ForwardBlock::translated(ForwardBlock::STICKER_UNAVAILABLE, $source->account->locale, [
                'inbox' => (string) $target->inbox->name,
            ]));
    }
}
