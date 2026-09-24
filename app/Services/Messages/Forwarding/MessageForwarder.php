<?php

namespace App\Services\Messages\Forwarding;

use App\Builders\Messages\MessageBuilder;
use App\Exceptions\MessageValidationException;
use App\Models\AgentBot;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\Channels\ChannelActionRegistry;
use Illuminate\Support\Facades\Storage;
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

            if ($source->content_type === Message::CONTENT_TYPES['sticker']) {
                $params = [...$params, 'content' => null, 'content_type' => 'sticker', 'sticker_id' => $this->stickerId($source, $target)];
            }

            foreach (ForwardRequirements::forwardableAttachments($source) as $attachment) {
                $copy = $attachment->copyStoredFile()
                    ?? throw new ForwardException(ForwardRequirements::attachmentUnavailable($attachment, $locale));
                $copiedFiles[] = $copy;
                $params['attachments'][] = Attachment::signUpload($copy);
            }

            return (new MessageBuilder($actor, $target, $params, trustedContentAttributes: [
                'forwarded_from' => [
                    'origin' => self::ORIGIN_INTERNAL,
                    'message_id' => $source->id,
                    'conversation_id' => $source->conversation->display_id,
                ],
            ]))->perform();
        } catch (MessageValidationException $exception) {
            $this->discardOrphanedCopies($copiedFiles);

            throw new ForwardException(new ForwardBlock(ForwardBlock::MESSAGE_INVALID, $exception->getMessage()));
        } catch (Throwable $exception) {
            $this->discardOrphanedCopies($copiedFiles);

            throw $exception;
        }
    }

    private function stickerId(Message $source, Conversation $target): string
    {
        $sticker = ChannelActionRegistry::stickers($target->inbox)?->fromStored($source->content_attributes['sticker']);

        return $sticker?->id
            ?? throw new ForwardException(ForwardBlock::translated(ForwardBlock::STICKER_UNAVAILABLE, $source->account->locale, [
                'inbox' => (string) $target->inbox->name,
            ]));
    }

    /**
     * Lỗi có thể nổ SAU khi tin đã lưu (vd lượt gửi đồng bộ ra kênh): tệp đã gắn
     * vào đính kèm thật thì giữ, chỉ dọn bản sao chưa ai dùng.
     *
     * @param  list<array<string, mixed>>  $copiedFiles
     */
    private function discardOrphanedCopies(array $copiedFiles): void
    {
        if ($copiedFiles === []) {
            return;
        }

        $attachedPaths = Attachment::query()
            ->whereIn('path', array_column($copiedFiles, 'path'))
            ->pluck('path')
            ->all();

        foreach ($copiedFiles as $copy) {
            if (! in_array($copy['path'], $attachedPaths, true)) {
                Storage::disk($copy['disk'])->delete($copy['path']);
            }
        }
    }
}
