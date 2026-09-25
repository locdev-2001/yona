<?php

namespace App\Builders\Messages\Messenger;

use App\Models\Attachment;
use App\Models\Message;
use App\Services\Channels\RemoteAttachmentDownloader;

/**
 * Phần xử lý đính kèm chung của Messenger và Instagram.
 */
abstract class BaseMessageBuilder
{
    /** @var array<string, string> Meta gửi tên kiểu không khớp enum file_type. */
    private const FILE_TYPE_ALIASES = ['reel' => 'ig_reel', 'sticker' => 'image'];

    /** @var list<string> Kiểu đính kèm bị bỏ qua. */
    private const UNSUPPORTED_TYPES = ['template', 'unsupported_type', 'ephemeral'];

    /** @var list<string> Kiểu đính kèm cần tải tệp về. */
    private const DOWNLOADABLE_TYPES = ['image', 'file', 'audio', 'video', 'share', 'story_mention', 'ig_reel', 'ig_post', 'ig_story'];

    /** @param array<string, mixed> $attachment */
    protected function processAttachment(Message $message, array $attachment): void
    {
        $type = $this->normalizeFileType((string) $attachment['type']);

        if (in_array($attachment['type'], self::UNSUPPORTED_TYPES, true)) {
            return;
        }

        if ($type === 'location') {
            $message->attachments()->create([
                'account_id' => $message->account_id,
                'file_type' => Attachment::FILE_TYPE_LOCATION,
                'external_url' => $attachment['url'] ?? null,
                'coordinates_lat' => data_get($attachment, 'payload.coordinates.lat'),
                'coordinates_long' => data_get($attachment, 'payload.coordinates.long'),
                'fallback_title' => $attachment['title'] ?? null,
            ]);

            return;
        }

        if ($type === 'fallback') {
            $message->attachments()->create([
                'account_id' => $message->account_id,
                'file_type' => Attachment::FILE_TYPE_FALLBACK,
                'fallback_title' => $attachment['title'] ?? data_get($attachment, 'payload.title'),
                'external_url' => $attachment['url'] ?? data_get($attachment, 'payload.url'),
            ]);

            return;
        }

        if (! in_array($type, self::DOWNLOADABLE_TYPES, true)) {
            return;
        }

        $url = $type === 'ig_story'
            ? data_get($attachment, 'payload.story_media_url')
            : data_get($attachment, 'payload.url');

        if (blank($url)) {
            return;
        }

        $attributes = RemoteAttachmentDownloader::download((string) $url, $message->account_id);

        if ($attributes === null) {
            // Không tải được vẫn giữ liên kết như bản gốc (attachment tạo trước blob).
            $message->attachments()->create([
                'account_id' => $message->account_id,
                'file_type' => Attachment::FILE_TYPES[$type] ?? Attachment::FILE_TYPE_FILE,
                'external_url' => $url,
            ]);

            return;
        }

        $attributes['external_url'] = $url;

        if (! in_array($type, ['share', 'story_mention'], true)) {
            $attributes['file_type'] = Attachment::fileTypeFromChannel(Attachment::FILE_TYPES[$type] ?? null, $attributes['content_type']);
        }

        $message->attachments()->create($attributes);
    }

    protected function normalizeFileType(string $type): string
    {
        return self::FILE_TYPE_ALIASES[$type] ?? $type;
    }
}
