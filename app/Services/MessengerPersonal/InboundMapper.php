<?php

namespace App\Services\MessengerPersonal;

use App\Jobs\Avatar\AvatarFromUrlJob;
use App\Messaging\Inbound\AttachmentKind;
use App\Messaging\Inbound\InboundAttachment;
use App\Messaging\Inbound\InboundDirection;
use App\Messaging\Inbound\InboundMessage;
use App\Messaging\Inbound\InboundMessageWriter;
use App\Messaging\Inbound\InboundSender;
use App\Messaging\Inbound\ReplyReference;
use App\Messaging\Stickers\StickerContent;
use App\Models\Channel\MessengerPersonal;
use App\Models\Contact;
use App\Models\Inbox;
use App\Models\Message;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

/**
 * Bóc sự kiện `inbound` của sidecar thành tin của lõi rồi ghi qua InboundMessageWriter.
 *
 * Liên hệ của hội thoại là phía bên kia của chat: người kia (direct) hoặc cả nhóm
 * (group). `source_id` liên hệ = id chat; người gửi thật của tin nhóm đi theo từng tin
 * ở `content_attributes.sender` (khoá chuẩn của năng lực `group_threads`).
 */
class InboundMapper
{
    private const KIND_STICKER = 'sticker';

    private const KIND_LOCATION = 'location';

    private const KIND_LINK = 'link';

    private const KIND_VIEW_ONCE = 'view_once';

    private const KIND_CALL = 'call';

    private const KIND_SYSTEM = 'system';

    private const KIND_UNSUPPORTED = 'unsupported';

    private const CALL_DIRECTIONS = ['inbound', 'outbound'];

    private const CALL_OUTCOMES = ['completed', 'missed', 'declined', 'canceled', 'busy'];

    /** @var array<string, AttachmentKind> `media[].kind` của hợp đồng → loại đính kèm của lõi */
    private const MEDIA_KINDS = [
        'image' => AttachmentKind::Image,
        'video' => AttachmentKind::Video,
        'audio' => AttachmentKind::Audio,
        'file' => AttachmentKind::File,
        'sticker' => AttachmentKind::Image,
    ];

    private const GIF_CONTENT_TYPE = 'image/gif';

    /** Khoá trong additional_attributes của liên hệ giữ tên/ảnh Messenger lần cuối thấy. */
    private const CONTACT_NAME_ATTRIBUTE = 'messenger_display_name';

    private const CONTACT_AVATAR_ATTRIBUTE = 'messenger_avatar_url';

    /** Số người ghép đủ tên vào tên nhóm chưa đặt tên → khoá dịch; đông hơn thì "và N người khác". */
    private const UNNAMED_GROUP_KEYS = [1 => 'one', 2 => 'two', 3 => 'three'];

    private const UNNAMED_GROUP_PLACEHOLDERS = ['first', 'second', 'third'];

    private const UNNAMED_GROUP_SHOWN_WITH_OTHERS = 2;

    public function __construct(
        private readonly InboundMessageWriter $writer,
        private readonly BridgeClient $bridge,
    ) {}

    /** @param array<string, mixed> $payload */
    public function write(Inbox $inbox, MessengerPersonal $channel, array $payload): ?Message
    {
        $chat = MessengerChat::fromPayload($payload['chat'] ?? null);
        $sourceId = trim((string) ($payload['source_id'] ?? ''));

        if ($chat === null || $sourceId === '') {
            return null;
        }

        $content = is_array($payload['content'] ?? null) ? $payload['content'] : [];
        $fromMe = ($payload['from_me'] ?? false) === true;
        $profile = $this->counterpartProfile($inbox, $chat, $payload, $fromMe);

        // Trước khi ghi: thông báo tin mới chụp tên/ảnh liên hệ ngay lúc tin được lưu.
        $this->refreshContactProfile($this->existingContact($inbox, $chat), $profile);

        return $this->writer->write($inbox, $this->counterpart($chat, $profile), new InboundMessage(
            sourceId: $sourceId,
            direction: $this->direction($content, $fromMe),
            text: $this->messageText($inbox, $content),
            sentAt: self::timestamp($payload['occurred_at'] ?? null),
            sticker: $this->sticker($content),
            attachments: $this->attachments($content),
            replyTo: filled($content['reply_to'] ?? null) ? new ReplyReference((string) $content['reply_to']) : null,
            attributes: $this->attributes($chat, $payload, $content, $fromMe, $profile),
            conversationAttributes: [MessengerPersonal::CONVERSATION_CHAT_ATTRIBUTE => $chat->toArray()],
            awaitsAcceptance: ! $fromMe && ($payload['is_request'] ?? false) === true,
        ));
    }

    /**
     * `chat_updated`: nhóm đổi tên, ảnh hoặc thành viên. Chỉ làm mới liên hệ nhóm đã có,
     * không mở hội thoại cho nhóm chưa từng nhắn.
     *
     * @param  array<string, mixed>  $payload
     */
    public function applyChatUpdate(Inbox $inbox, array $payload): void
    {
        $chat = MessengerChat::fromPayload($payload['chat'] ?? null);

        if ($chat === null || ! $chat->isGroup()) {
            return;
        }

        $this->refreshContactProfile($this->existingContact($inbox, $chat), $this->counterpartProfile($inbox, $chat, $payload, fromMe: false));
    }

    private function existingContact(Inbox $inbox, MessengerChat $chat): ?Contact
    {
        return $inbox->contactInboxes()->where('source_id', $chat->id)->first()?->contact;
    }

    /** @param array{name: string|null, avatar: string|null} $profile */
    private function counterpart(MessengerChat $chat, array $profile): InboundSender
    {
        return new InboundSender(
            sourceId: $chat->id,
            name: $profile['name'],
            avatarUrl: $profile['avatar'],
            additionalAttributes: [
                MessengerPersonal::CONTACT_CHAT_KIND_ATTRIBUTE => $chat->kind,
                self::CONTACT_NAME_ATTRIBUTE => $profile['name'],
                self::CONTACT_AVATAR_ATTRIBUTE => $profile['avatar'],
            ],
        );
    }

    /**
     * Tên/ảnh của phía bên kia: nhóm lấy tên nhóm (chưa đặt tên thì ghép tên thành viên);
     * chat 1-1 lấy hồ sơ người gửi, trừ khi chính chủ tài khoản gửi từ app khác — khi đó
     * chỉ còn tên chat (nếu sidecar kèm).
     *
     * @param  array<string, mixed>  $payload
     * @return array{name: string|null, avatar: string|null}
     */
    private function counterpartProfile(Inbox $inbox, MessengerChat $chat, array $payload, bool $fromMe): array
    {
        $chatProfile = is_array($payload['chat'] ?? null) ? $payload['chat'] : [];

        if ($chat->isGroup()) {
            return [
                'name' => self::text($chatProfile['name'] ?? null) ?? $this->unnamedGroupName($chatProfile, $inbox->account->locale),
                'avatar' => self::text($chatProfile['avatar_url'] ?? null),
            ];
        }

        $source = $fromMe ? $chatProfile : (is_array($payload['sender'] ?? null) ? $payload['sender'] : []);

        return [
            'name' => self::text($source['name'] ?? null),
            'avatar' => self::text($source['avatar_url'] ?? null),
        ];
    }

    /**
     * Messenger gọi nhóm chưa đặt tên bằng tên gọi của thành viên: "An, Bình và Chi",
     * đông hơn thì "An, Bình và 3 người khác". `participant_count` là tổng số thành viên
     * trừ chính chủ, `participants` chỉ là phần đầu danh sách.
     *
     * @param  array<string, mixed>  $chatProfile
     */
    private function unnamedGroupName(array $chatProfile, ?string $locale): ?string
    {
        $names = [];

        foreach (is_array($chatProfile['participants'] ?? null) ? $chatProfile['participants'] : [] as $participant) {
            $name = is_array($participant) ? self::text($participant['first_name'] ?? null) ?? self::text($participant['name'] ?? null) : null;

            if ($name !== null) {
                $names[] = $name;
            }
        }

        if ($names === []) {
            return null;
        }

        $total = max(count($names), is_numeric($chatProfile['participant_count'] ?? null) ? (int) $chatProfile['participant_count'] : 0);

        if ($total === count($names) && isset(self::UNNAMED_GROUP_KEYS[$total])) {
            return __('conversations.unnamed_group.'.self::UNNAMED_GROUP_KEYS[$total], array_combine(
                array_slice(self::UNNAMED_GROUP_PLACEHOLDERS, 0, $total),
                $names,
            ), $locale);
        }

        $shown = array_slice($names, 0, self::UNNAMED_GROUP_SHOWN_WITH_OTHERS);
        $others = $total - count($shown);

        return trans_choice('conversations.unnamed_group.others', $others, ['names' => implode(', ', $shown), 'count' => $others], $locale);
    }

    /** @param array<string, mixed> $content */
    private function direction(array $content, bool $fromMe): InboundDirection
    {
        if (($content['kind'] ?? null) === self::KIND_SYSTEM) {
            return InboundDirection::Activity;
        }

        return $fromMe ? InboundDirection::Echo : InboundDirection::Incoming;
    }

    /**
     * Loại tin không có nội dung để hiện (xem một lần, cuộc gọi, chưa hỗ trợ) mang nhãn
     * dịch theo ngôn ngữ của hộp thư, để danh sách hội thoại không hiện dòng rỗng.
     *
     * @param  array<string, mixed>  $content
     */
    private function messageText(Inbox $inbox, array $content): ?string
    {
        $text = self::text($content['text'] ?? null);
        $locale = $inbox->account->locale;

        return match ($content['kind'] ?? null) {
            self::KIND_VIEW_ONCE => __('conversations.messages.view_once', [], $locale),
            self::KIND_CALL => __('conversations.messages.call', [], $locale),
            self::KIND_UNSUPPORTED => $text ?? __('conversations.messages.unsupported', [], $locale),
            default => $text,
        };
    }

    /**
     * Sticker Messenger không kèm mã danh mục; ảnh đi đường đính kèm (URL CDN có hạn) và
     * mã lấy theo đường dẫn ảnh để cùng một sticker luôn ra cùng một mã.
     *
     * @param  array<string, mixed>  $content
     */
    private function sticker(array $content): ?StickerContent
    {
        if (($content['kind'] ?? null) !== self::KIND_STICKER) {
            return null;
        }

        $media = $this->mediaItems($content)[0] ?? null;
        $url = is_array($media) ? (string) ($media['url'] ?? '') : '';

        return $url === '' ? null : new StickerContent(id: 'messenger:'.sha1((string) parse_url($url, PHP_URL_PATH)));
    }

    /**
     * @param  array<string, mixed>  $content
     * @return list<InboundAttachment>
     */
    private function attachments(array $content): array
    {
        $specs = [];

        foreach ($this->mediaItems($content) as $media) {
            $spec = $this->mediaAttachment($media);

            if ($spec !== null) {
                $specs[] = $spec;
            }
        }

        $location = $content['location'] ?? null;

        if (is_array($location) && is_numeric($location['lat'] ?? null) && is_numeric($location['lng'] ?? null)) {
            $specs[] = InboundAttachment::location((float) $location['lat'], (float) $location['lng'], self::text($location['name'] ?? null));
        }

        return $specs;
    }

    /**
     * Tệp kênh mã hoá nằm trên chính sidecar và cần UI secret; tệp kênh thường là URL CDN
     * công khai của Meta. Chỉ URL cùng gốc với MESSENGER_BRIDGE_URL mới mang secret.
     *
     * @param  array<string, mixed>  $media
     */
    private function mediaAttachment(array $media): ?InboundAttachment
    {
        $url = trim((string) ($media['url'] ?? ''));

        if (! preg_match('#^https?://#i', $url)) {
            return null;
        }

        $kind = self::MEDIA_KINDS[(string) ($media['kind'] ?? '')] ?? AttachmentKind::File;

        if ($kind === AttachmentKind::Image && ($media['content_type'] ?? null) === self::GIF_CONTENT_TYPE) {
            $kind = AttachmentKind::Gif;
        }

        $filename = self::text($media['filename'] ?? null);

        return $this->bridge->ownsUrl($url)
            ? InboundAttachment::fromTrustedService($url, $kind, $filename, $this->bridge->mediaHeaders())
            : InboundAttachment::download($url, $kind, $filename, urlIsPublic: true);
    }

    /**
     * @param  array<string, mixed>  $content
     * @return list<array<string, mixed>>
     */
    private function mediaItems(array $content): array
    {
        $media = is_array($content['media'] ?? null) ? $content['media'] : [];

        return array_values(array_filter($media, 'is_array'));
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $content
     * @param  array{name: string|null, avatar: string|null}  $profile
     * @return array<string, mixed>
     */
    private function attributes(MessengerChat $chat, array $payload, array $content, bool $fromMe, array $profile): array
    {
        return array_filter([
            ...$this->groupContext($chat, $payload, $content, $profile),
            'link_preview' => ($content['kind'] ?? null) === self::KIND_LINK ? $this->linkPreview($content['link'] ?? null) : null,
            ...$this->cardAttributes($content, $fromMe),
        ], fn ($value) => $value !== null);
    }

    /**
     * Tin nhóm: ai gửi, thuộc nhóm nào, nhắc tên ai — khoá chuẩn `sender`/`thread`/`mentions`
     * bong bóng lõi đọc.
     *
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $content
     * @param  array{name: string|null, avatar: string|null}  $profile
     * @return array<string, mixed>
     */
    private function groupContext(MessengerChat $chat, array $payload, array $content, array $profile): array
    {
        if (! $chat->isGroup()) {
            return [];
        }

        $sender = is_array($payload['sender'] ?? null) ? $payload['sender'] : [];
        $mentions = $this->mentions($content);

        return array_filter([
            'sender' => filled($sender['id'] ?? null) ? [
                'external_id' => (string) $sender['id'],
                'name' => self::text($sender['name'] ?? null) ?? '',
                'avatar' => self::text($sender['avatar_url'] ?? null),
            ] : null,
            'thread' => [
                'id' => $chat->id,
                'name' => $profile['name'],
                'avatar' => $profile['avatar'],
            ],
            'mentions' => $mentions === [] ? null : $mentions,
        ]);
    }

    /**
     * `content.mentions` của sidecar đã đúng chuẩn nhắc tên của lõi (UTF-16, `@name` nằm
     * ở [offset, offset + length) của chữ); chỉ đổi `id` thành `external_id`.
     *
     * @param  array<string, mixed>  $content
     * @return list<array{external_id: string, name: string, offset: int, length: int}>
     */
    private function mentions(array $content): array
    {
        $mentions = [];

        foreach (is_array($content['mentions'] ?? null) ? $content['mentions'] : [] as $mention) {
            $name = is_array($mention) ? self::text($mention['name'] ?? null) : null;

            if ($name === null || ! is_scalar($mention['id'] ?? null) || ! is_int($mention['offset'] ?? null) || ! is_int($mention['length'] ?? null)) {
                continue;
            }

            $mentions[] = [
                'external_id' => (string) $mention['id'],
                'name' => $name,
                'offset' => $mention['offset'],
                'length' => $mention['length'],
            ];
        }

        return $mentions;
    }

    /**
     * Khoá chuẩn của xem trước liên kết `{url, title, description, image}`; thẻ không có
     * URL http(s) thì không có gì để mở.
     *
     * @return array<string, string>|null
     */
    private function linkPreview(mixed $link): ?array
    {
        if (! is_array($link)) {
            return null;
        }

        $url = trim((string) ($link['url'] ?? ''));

        if (! preg_match('#^https?://#i', $url)) {
            return null;
        }

        return array_filter([
            'url' => $url,
            'title' => self::text($link['title'] ?? null),
            'description' => self::text($link['description'] ?? null),
            'image' => self::text($link['image_url'] ?? null),
        ], fn ($value) => $value !== null);
    }

    /**
     * `card_update`: thẻ đã ghi nhận nội dung mới (kết cục cuộc gọi…). Chỉ đè các khoá thẻ
     * trong `content_attributes`; lưu tin là lõi tự phát `message.updated`.
     *
     * @param  array<string, mixed>  $payload
     */
    public function applyCardUpdate(Inbox $inbox, array $payload): void
    {
        $sourceId = trim((string) ($payload['target_source_id'] ?? ''));
        $content = is_array($payload['content'] ?? null) ? $payload['content'] : [];
        $cards = $this->cardAttributes($content, ($payload['from_me'] ?? false) === true);

        if ($sourceId === '' || $cards === []) {
            return;
        }

        $message = Message::query()->where('inbox_id', $inbox->id)->where('source_id', $sourceId)->first();

        if ($message === null) {
            return;
        }

        $message->content_attributes = [...($message->content_attributes ?? []), ...$cards];
        $message->save();
    }

    /**
     * Khoá thẻ trung tính bong bóng lõi đọc theo loại nội dung: `call` cho nhật ký cuộc gọi.
     *
     * @param  array<string, mixed>  $content
     * @return array<string, mixed>
     */
    private function cardAttributes(array $content, bool $fromMe): array
    {
        return array_filter([
            'call' => ($content['kind'] ?? null) === self::KIND_CALL ? $this->callLog($content, $fromMe) : null,
        ], fn ($value) => $value !== null);
    }

    /**
     * Sidecar gửi `content.call` {direction, media, outcome, duration_seconds}; bản sidecar cũ chỉ
     * có chuỗi mô tả (`missed_audio_call`, `video_call`…). Thẻ cuộc gọi của lõi đọc
     * `content_attributes.call` {media, direction, outcome, duration_seconds}.
     *
     * @param  array<string, mixed>  $content
     * @return array{media: string, direction: string, outcome: string|null, duration_seconds: int|null}
     */
    private function callLog(array $content, bool $fromMe): array
    {
        $call = is_array($content['call'] ?? null) ? $content['call'] : [];
        $description = strtolower((string) ($content['text'] ?? ''));
        $media = $call['media'] ?? (str_contains($description, 'video') ? 'video' : null);
        $outcome = $call['outcome'] ?? (str_contains($description, 'missed') ? 'missed' : null);

        return [
            'media' => $media === 'video' ? 'video' : 'voice',
            'direction' => in_array($call['direction'] ?? null, self::CALL_DIRECTIONS, true) ? $call['direction'] : ($fromMe ? 'outbound' : 'inbound'),
            'outcome' => in_array($outcome, self::CALL_OUTCOMES, true) ? $outcome : null,
            'duration_seconds' => is_int($call['duration_seconds'] ?? null) ? max(0, $call['duration_seconds']) : null,
        ];
    }

    /**
     * Builder lõi chỉ ghi tên/ảnh lúc TẠO liên hệ. Tin đầu có thể là tin chính chủ gửi
     * (chưa biết tên người kia), nên tin sau được lấp tên/ảnh — nhưng chỉ đè tên do nền
     * tảng đặt, không đụng tên người dùng tự sửa. Ảnh đổi (khác đường dẫn, Meta ký lại
     * URL mỗi lần) thì tải lại.
     *
     * @param  array{name: string|null, avatar: string|null}  $profile
     */
    private function refreshContactProfile(?Contact $contact, array $profile): void
    {
        if ($contact === null) {
            return;
        }

        $attributes = $contact->additional_attributes ?? [];
        $storedName = trim((string) ($attributes[self::CONTACT_NAME_ATTRIBUTE] ?? ''));

        if ($profile['name'] !== null && ($storedName === '' || trim((string) $contact->name) === $storedName)) {
            $contact->name = $profile['name'];
            $attributes[self::CONTACT_NAME_ATTRIBUTE] = $profile['name'];
        }

        // Mỗi ảnh chỉ thử một lần: tải hỏng thì tin sau không đẩy lại job vô hạn.
        $storedAvatar = $attributes[self::CONTACT_AVATAR_ATTRIBUTE] ?? null;
        $avatarIsNew = $profile['avatar'] !== null && $storedAvatar !== $profile['avatar'];
        $pictureChanged = $avatarIsNew && self::urlPath($storedAvatar) !== self::urlPath($profile['avatar']);

        if ($avatarIsNew) {
            $attributes[self::CONTACT_AVATAR_ATTRIBUTE] = $profile['avatar'];
        }

        $contact->additional_attributes = $attributes;

        if ($contact->isDirty()) {
            $contact->save();
        }

        if ($pictureChanged || ($avatarIsNew && $contact->avatar === null)) {
            AvatarFromUrlJob::dispatch($contact, $profile['avatar']);
        }
    }

    private static function urlPath(mixed $url): ?string
    {
        return is_string($url) ? (parse_url($url, PHP_URL_PATH) ?: null) : null;
    }

    private static function timestamp(mixed $milliseconds): ?CarbonInterface
    {
        return is_numeric($milliseconds) && (int) $milliseconds > 0 ? Carbon::createFromTimestampMs((int) $milliseconds) : null;
    }

    private static function text(mixed $value): ?string
    {
        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }
}
