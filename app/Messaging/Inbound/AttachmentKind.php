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

    // Bài đăng/story của Meta: lõi đã có file_type riêng để giao diện vẽ đúng.
    case Share = 'share';
    case StoryMention = 'story_mention';
    case IgReel = 'ig_reel';
    case IgPost = 'ig_post';
    case IgStory = 'ig_story';
    case Embed = 'embed';

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
            self::Share => Attachment::FILE_TYPE_SHARE,
            self::StoryMention => Attachment::FILE_TYPE_STORY_MENTION,
            self::IgReel => Attachment::FILE_TYPE_IG_REEL,
            self::IgPost => Attachment::FILE_TYPE_IG_POST,
            self::IgStory => Attachment::FILE_TYPE_IG_STORY,
            self::Embed => Attachment::FILE_TYPE_EMBED,
        };
    }

    public function isMedia(): bool
    {
        return ! in_array($this, [self::Location, self::ContactCard, self::Fallback], true);
    }
}
