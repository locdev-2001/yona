<?php

namespace App\Messaging\Inbound;

use App\Models\Attachment;

/** Loại đính kèm theo cách kênh khai; lõi đổi sang `file_type` và suy lại theo MIME khi kênh chỉ nói "tệp". */
enum AttachmentKind: string
{
    case Image = 'image';
    case Gif = 'gif';
    case Video = 'video';
    case Audio = 'audio';
    case Voice = 'voice';
    case File = 'file';
    case Location = 'location';
    case ContactCard = 'contact_card';
    case Fallback = 'fallback';

    public function fileType(): int
    {
        return match ($this) {
            self::Image, self::Gif => Attachment::FILE_TYPE_IMAGE,
            self::Video => Attachment::FILE_TYPE_VIDEO,
            self::Audio, self::Voice => Attachment::FILE_TYPE_AUDIO,
            self::File => Attachment::FILE_TYPE_FILE,
            self::Location => Attachment::FILE_TYPE_LOCATION,
            self::ContactCard => Attachment::FILE_TYPE_CONTACT,
            self::Fallback => Attachment::FILE_TYPE_FALLBACK,
        };
    }

    public function isMedia(): bool
    {
        return ! in_array($this, [self::Location, self::ContactCard, self::Fallback], true);
    }
}
