<?php

namespace App\Jobs\Attachments;

use App\Jobs\ApplicationJob;
use App\Models\Attachment;
use App\Support\ThumbnailGenerator;
use Illuminate\Support\Facades\Storage;

/**
 * Dựng ảnh thu nhỏ cho một ảnh đính kèm và bù kích thước đã xoay theo EXIF vào
 * `meta`. Ghi `meta.thumb` cả khi không cần thu nhỏ để lượt sau (kể cả lệnh
 * backfill) không đọc lại ảnh.
 */
class GenerateAttachmentThumbnailJob extends ApplicationJob
{
    public function __construct(public readonly Attachment $attachment)
    {
        $this->onQueue('media');
    }

    public function handle(ThumbnailGenerator $generator): void
    {
        $attachment = $this->attachment->fresh();

        if ($attachment === null || ! $attachment->needsThumbnail()) {
            return;
        }

        $disk = Storage::disk($attachment->disk);
        $imageBytes = $disk->get((string) $attachment->path);
        $result = $imageBytes === null ? null : $generator->generate($imageBytes);

        if ($result === null) {
            $attachment->updateQuietly(['meta' => [...($attachment->meta ?? []), Attachment::META_THUMBNAIL => false]]);

            return;
        }

        $hasThumbnail = $result['thumbnail'] !== null;

        if ($hasThumbnail) {
            $disk->put($attachment->thumbnailPath(), $result['thumbnail']);
        }

        $attachment->updateQuietly(['meta' => [
            ...($attachment->meta ?? []),
            'width' => $result['width'],
            'height' => $result['height'],
            Attachment::META_THUMBNAIL => $hasThumbnail,
        ]]);
    }
}
