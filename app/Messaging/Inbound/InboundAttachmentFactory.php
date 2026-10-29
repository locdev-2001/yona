<?php

namespace App\Messaging\Inbound;

use App\Models\Attachment;
use App\Services\Channels\RemoteAttachmentDownloader;

/**
 * Nơi duy nhất đổi mô tả đính kèm của kênh thành bản ghi Attachment: tải tệp, suy loại
 * theo MIME khi kênh chỉ báo "tệp", và giữ dấu vết bằng fallback khi tải hỏng (có
 * liên kết để tự tải lại khi URL công khai, không có khi URL cần token).
 */
final class InboundAttachmentFactory
{
    public function build(InboundAttachment $spec, int $accountId): Attachment
    {
        return match ($spec->kind) {
            AttachmentKind::Location => new Attachment([
                'account_id' => $accountId,
                'file_type' => Attachment::FILE_TYPE_LOCATION,
                'coordinates_lat' => $spec->latitude,
                'coordinates_long' => $spec->longitude,
                'fallback_title' => self::title($spec->title),
                'external_url' => $spec->externalUrl,
            ]),
            AttachmentKind::ContactCard => new Attachment([
                'account_id' => $accountId,
                'file_type' => Attachment::FILE_TYPE_CONTACT,
                'fallback_title' => self::title($spec->title) ?? '',
                'meta' => array_filter($spec->meta, fn ($value) => $value !== null),
            ]),
            AttachmentKind::Fallback => new Attachment(
                RemoteAttachmentDownloader::fallbackAttributes($accountId, $spec->title, $spec->externalUrl),
            ),
            default => $this->media($spec, $accountId),
        };
    }

    private function media(InboundAttachment $spec, int $accountId): Attachment
    {
        if ($spec->downloadUrl === null) {
            return new Attachment([
                'account_id' => $accountId,
                'file_type' => $spec->kind->fileType(),
                'external_url' => $spec->externalUrl,
                'meta' => $this->meta($spec),
            ]);
        }

        $attributes = RemoteAttachmentDownloader::download(
            url: $spec->downloadUrl,
            accountId: $accountId,
            filename: $spec->filename,
            headers: $spec->headers,
            basicAuth: $spec->basicAuth,
            trustedService: $spec->trustedService,
        );

        if ($attributes === null) {
            return new Attachment(RemoteAttachmentDownloader::fallbackAttributes(
                accountId: $accountId,
                filename: $spec->filename ?? self::filenameFromUrl($spec->downloadUrl),
                externalUrl: $spec->urlIsPublic ? $spec->downloadUrl : null,
                reportedFileType: $spec->kind->fileType(),
            ));
        }

        $attributes['file_type'] = Attachment::fileTypeFromChannel($spec->kind->fileType(), $attributes['content_type'] ?? null);

        if ($spec->urlIsPublic) {
            $attributes['external_url'] = $spec->downloadUrl;
        }

        $meta = $this->meta($spec);

        if ($meta !== []) {
            $attributes['meta'] = [...($attributes['meta'] ?? []), ...$meta];
        }

        return new Attachment($attributes);
    }

    /** @return array<string, mixed> */
    private function meta(InboundAttachment $spec): array
    {
        return $spec->kind === AttachmentKind::Voice
            ? [...$spec->meta, Attachment::META_VOICE_MESSAGE => true]
            : $spec->meta;
    }

    private static function title(?string $title): ?string
    {
        return filled($title) ? mb_substr((string) $title, 0, 255) : null;
    }

    private static function filenameFromUrl(string $url): ?string
    {
        return basename((string) parse_url($url, PHP_URL_PATH)) ?: null;
    }
}
