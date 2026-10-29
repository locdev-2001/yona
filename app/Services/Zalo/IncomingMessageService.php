<?php

namespace App\Services\Zalo;

use App\Actions\ContactMergeAction;
use App\Builders\ContactInboxBuilder;
use App\Builders\ContactInboxWithContactBuilder;
use App\Messaging\Inbound\AttachmentKind;
use App\Messaging\Inbound\InboundAttachment;
use App\Messaging\Inbound\InboundAttachmentFactory;
use App\Messaging\Stickers\StickerContent;
use App\Messaging\Stickers\StickerMessage;
use App\Models\Attachment;
use App\Models\Channel\Zalo;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Channels\IncomingConversationResolver;
use App\Services\Conversations\GroupMembersService;
use App\Services\Messages\OutboundMentionsBuilder;
use App\Services\Zalo\Exception\EchoAwaitingSourceIdException;
use App\Support\PhoneNumber;
use Illuminate\Support\Carbon;

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
    /**
     * Loại Zalo khẳng định cụ thể. `share.file` (inbound_kind `file`) cố ý
     * không có ở đây: người gửi chọn "gửi tệp" không nói gì về nội dung, nên
     * lõi quyết theo MIME (mp4 gửi dạng tệp vẫn hiện trình phát video).
     *
     * @var array<string, int>
     */
    private const ATTACHMENT_KINDS = [
        'image' => AttachmentKind::Image,
        'gif' => AttachmentKind::Gif,
        'video' => AttachmentKind::Video,
        'audio' => AttachmentKind::Audio,
    ];

    private const STICKER_KIND = 'sticker';

    private const LOCATION_KIND = 'location';

    /**
     * Trạng thái hội thoại mà lô tin lịch sử không được phép đổi: tin cũ kéo về
     * sau khi bridge nối lại không phải hoạt động mới của khách.
     */
    private const CONVERSATION_STATE_COLUMNS = ['status', 'waiting_since', 'first_reply_created_at', 'last_activity_at'];

    /**
     * Tin đã thu hồi vẫn nằm trong lịch sử Zalo và quay lại theo đường backfill
     * dưới dạng `chat.undo` + nội dung nhãn ("[Tin nhắn]"). Tạo lại là dựng dậy
     * thứ khách đã xoá, nên bỏ qua hẳn.
     */
    private const RECALLED_MSG_TYPE = 'chat.undo';

    /**
     * Các trường zca-js cần để dựng lại `SendMessageQuote` khi agent trả lời trích
     * dẫn (node_modules/zca-js/dist/apis/sendMessage.d.ts:9). Giữ đúng chừng này,
     * KHÔNG bê nguyên `listener_data` vào content_attributes.
     */
    private const ZCA_QUOTE_FIELDS = ['content', 'msgType', 'propertyExt', 'uidFrom', 'msgId', 'cliMsgId', 'ts', 'ttl'];

    // Thứ tự tra URL ảnh sticker trong payload bridge (zca-js đặt nhiều tên).
    private const STICKER_URL_KEYS = ['stickerUrl', 'url', 'thumbnail', 'stickerSpriteUrl'];

    /**
     * Khoá chuẩn hoá của năng lực `group_threads` (docs/channel-capabilities.md
     * §2.4) — lõi và bong bóng đọc đúng chừng này, không mang tên riêng của Zalo.
     */
    private const GROUP_SENDER_KEYS = GroupMembersService::MEMBER_KEYS;

    private const GROUP_MENTION_KEYS = OutboundMentionsBuilder::KEYS;

    private const GROUP_THREAD_KEYS = ['id', 'name', 'avatar'];

    private const REPLY_PREVIEW_MAX_LENGTH = 500;

    /** Loại tin Zalo của tin được trích dẫn → `attachment_type` trung tính của lõi. */
    private const QUOTE_ATTACHMENT_TYPES = [
        'chat.photo' => 'image',
        'chat.gif' => 'image',
        'chat.video.msg' => 'video',
        'chat.voice' => 'audio',
        'share.file' => 'file',
        'chat.location.new' => 'location',
        'chat.location' => 'location',
    ];

    /**
     * Trích dẫn thật của zca chỉ mang mã số `cliMsgType` (không có `msgType`) —
     * cùng bảng quy đổi với `getClientMessageType` của zca-js.
     */
    private const QUOTE_ATTACHMENT_TYPES_BY_CLIENT_TYPE = [
        32 => 'image',
        49 => 'image',
        44 => 'video',
        31 => 'audio',
        46 => 'file',
        43 => 'location',
    ];

    /**
     * Cờ do lớp hàng đợi bật khi đã chờ hết lượt cho tin dội lại: dựng tin ngay
     * lượt này thay vì hoãn tiếp (xem EchoAwaitingSourceIdException).
     */
    public const ECHO_WAIT_EXHAUSTED = 'echo_wait_exhausted';

    /** @var array{kind: string, data: array<string, mixed>}|null */
    private ?array $card = null;

    private bool $cardParsed = false;

    private ?ZaloCustomSticker $customSticker = null;

    private bool $customStickerParsed = false;

    /** @param array<string, mixed> $params */
    public function __construct(
        private readonly Inbox $inbox,
        private readonly array $params,
    ) {}

    public function perform(): ?Message
    {
        $threadUid = (string) ($this->params['peer_uid'] ?? $this->params['thread_id'] ?? '');

        if ($threadUid === '' || $this->isRecalled()) {
            return null;
        }

        $sourceId = isset($this->params['source_id']) ? (string) $this->params['source_id'] : null;
        $existing = $this->findBySourceId($sourceId);

        if ($existing !== null) {
            // Tin CRM vừa gửi dội lại (echo): bản ghi đã có nhưng chưa biết
            // `cliMsgId` — chỉ nền tảng mới cấp. Ghi bổ sung để về sau khách
            // trích dẫn chính tin này còn tra ngược được.
            $this->backfillZcaMessage($existing);

            return null;
        }

        $this->guardEchoStillSettling($sourceId);

        $contactInbox = $this->resolveContactInbox($threadUid);

        if ($contactInbox === null) {
            return null;
        }

        $this->syncContactProfile($contactInbox, $threadUid);

        $conversation = IncomingConversationResolver::resolve($contactInbox, [
            'thread_id' => $threadUid,
            'thread_type' => (int) ($this->params['thread_type'] ?? 0),
        ]);

        $isOutgoing = $this->direction() !== 'in';
        $isChatTip = ZaloChatTip::matches($this->zcaMessage());

        $message = $conversation->messages()->make([
            'content' => $this->content(),
            'account_id' => $this->inbox->account_id,
            'inbox_id' => $this->inbox->id,
            'content_type' => Message::CONTENT_TYPES['text'],
            'message_type' => match (true) {
                $isChatTip => Message::TYPE_ACTIVITY,
                $isOutgoing => Message::TYPE_OUTGOING,
                default => Message::TYPE_INCOMING,
            },
            'content_attributes' => $this->contentAttributes($conversation),
            'source_id' => $sourceId,
        ]);

        if (! $isOutgoing && ! $isChatTip) {
            $message->sender()->associate($contactInbox->contact);
        }

        // Gốc gắn tệp TRƯỚC `save!` (`Whatsapp::IncomingMessageBaseService#attach_files`
        // → `@message.attachments.new(...)` → `@message.save!`) nên sự kiện
        // `message.created` phát ra đã có đính kèm. Gắn sau khi lưu thì payload
        // realtime rỗng và bong bóng chỉ hiện lại sau khi tải lại trang.
        $message->pendingAttachments = $this->buildAttachments($message->account_id);

        $sticker = $this->sticker();

        if ($sticker !== null) {
            // Sticker tự tạo ngoài kho Yona chỉ có ảnh JPG trên CDN Zalo (có hạn dùng):
            // ảnh là bản đã tải về như ảnh thường; các sticker khác trỏ thẳng CDN.
            StickerMessage::apply($message, $sticker, $sticker->imageUrl === null ? ($message->pendingAttachments[0] ?? null) : null);
        }

        // Thứ tự tin theo giờ NỀN TẢNG chứ không theo giờ ghi vào CSDL: lô lịch
        // sử kéo về sau khi bridge nối lại phải nằm đúng chỗ cũ trong dòng hội
        // thoại, và không được đếm vào chưa đọc (unread so `created_at` với
        // `agent_last_seen_at`).
        $sentAt = $this->sentAt();

        if ($sentAt !== null) {
            $message->platform_sent_at = $sentAt;

            // Lô lịch sử còn lấy `created_at` theo giờ đó để không bị đếm vào chưa đọc.
            if ($this->isBackfill()) {
                $message->created_at = $sentAt;
            }
        }

        $this->persist($message, $conversation);

        return $message;
    }

    /**
     * Lô tin lịch sử KHÔNG phải hoạt động mới: không mở lại hội thoại đã đóng,
     * không dời mốc chờ / mốc hoạt động. Lõi không có khái niệm "tin hồi phục"
     * (bản gốc cũng không), nên chụp trạng thái trước khi ghi rồi trả về
     * nguyên trạng ngay tại driver thay vì nới hợp đồng dùng chung.
     */
    private function persist(Message $message, Conversation $conversation): void
    {
        if (! $this->isBackfill()) {
            $message->save();

            return;
        }

        $snapshot = $conversation->only(self::CONVERSATION_STATE_COLUMNS);

        $message->save();

        $conversation->newModelQuery()->whereKey($conversation->getKey())->toBase()->update($snapshot);
        $conversation->forceFill($snapshot)->syncOriginal();
    }

    private function isBackfill(): bool
    {
        return ($this->params['backfill'] ?? null) === true;
    }

    private function sentAt(): ?Carbon
    {
        $sentAtMs = $this->params['platform_sent_at'] ?? null;

        if (! is_numeric($sentAtMs)) {
            return null;
        }

        $sentAt = Carbon::createFromTimestampMs((int) $sentAtMs);

        // Mốc rác (0, âm) hoặc đồng hồ điện thoại chạy trước: thà lấy giờ máy chủ
        // còn hơn ném tin ra khỏi dòng thời gian.
        return $sentAt->year < 2000 || $sentAt->isFuture() ? null : $sentAt;
    }

    /**
     * Tin dội lại chưa khớp bí danh nào có thể là phần sau của một tin Yona đang
     * gửi dở: chiều ra ghi msgId của TỪNG phần ngay khi bridge trả về, nhưng
     * echo vẫn có thể về trước lượt ghi đó (bằng chứng: `g1-inbound-evidence.md`
     * §7, tin ma 884). Nhường một nhịp cho chiều ra rồi hãy kết luận.
     *
     * Lô lịch sử (`backfill`) không có cuộc đua này — tin đã cũ hàng giờ — nên
     * không bắt nó chờ.
     */
    private function guardEchoStillSettling(?string $sourceId): void
    {
        if ($sourceId === null || $this->direction() === 'in' || $this->isBackfill()) {
            return;
        }

        if (($this->params[self::ECHO_WAIT_EXHAUSTED] ?? null) === true) {
            return;
        }

        throw new EchoAwaitingSourceIdException("Tin dội lại {$sourceId} chưa khớp bí danh nào của chiều ra");
    }

    /**
     * Dedupe theo INBOX, không theo hội thoại: `source_id` là định danh của nền
     * tảng trên cả kênh (gốc `Message.find_by(source_id:)` /
     * `@inbox.messages.find_by(source_id:)`). Tra theo hội thoại làm tin cũ được
     * kéo về sau khi bridge khởi động lại chui sang hội thoại mới của cùng liên hệ.
     */
    private function findBySourceId(?string $sourceId): ?Message
    {
        if ($sourceId === null) {
            return null;
        }

        $message = Message::query()
            ->where('inbox_id', $this->inbox->id)
            ->where('source_id', $sourceId)
            ->first();

        return $message ?? $this->findByAliasSourceId($sourceId);
    }

    /**
     * Một tin Zalo có thể mang NHIỀU msgId (ảnh + chú thích, tệp + chú thích,
     * ảnh + trích dẫn): chiều ra ghi mọi msgId vào
     * `content_attributes.external_source_ids`, chiều vào phải tra cả danh sách đó —
     * thiếu thì echo của msgId thứ hai lọt lưới dedupe và hiện thành bong bóng ma.
     *
     * Chỉ tra với tin dội lại (`direction` ≠ `in`): bí danh chỉ có trên tin do
     * chính hệ thống gửi đi, mà `content_attributes` là cột `json` nên phép tra
     * này chưa có index đỡ — đừng bắt mọi tin khách gửi phải trả giá.
     */
    private function findByAliasSourceId(string $sourceId): ?Message
    {
        if ($this->direction() === 'in') {
            return null;
        }

        return Message::query()
            ->where('inbox_id', $this->inbox->id)
            ->whereRaw("jsonb_exists((content_attributes)::jsonb -> 'external_source_ids', ?)", [$sourceId])
            ->first();
    }

    private function isRecalled(): bool
    {
        $listenerData = is_array($this->params['listener_data'] ?? null) ? $this->params['listener_data'] : [];

        return ($listenerData['msgType'] ?? $this->params['msg_type'] ?? null) === self::RECALLED_MSG_TYPE;
    }

    private function resolveContactInbox(string $threadUid): ?ContactInbox
    {
        $existing = $this->inbox->contactInboxes()->where('source_id', $threadUid)->first();

        if ($existing !== null) {
            return $existing;
        }

        // Uid Zalo là khóa ổn định DUY NHẤT của một người trên kênh này: cùng
        // khách nhắn vào inbox Zalo thứ hai, hoặc inbox bị xóa rồi tạo lại, vẫn
        // phải về đúng một hồ sơ. Lõi chỉ dedupe theo identifier → email → số
        // điện thoại nên phép tra đặc thù này sống ở driver, lõi giữ nguyên.
        $known = $this->contactByZaloUserId($threadUid);

        if ($known !== null) {
            return (new ContactInboxBuilder(contact: $known, inbox: $this->inbox, sourceId: $threadUid))->perform();
        }

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

    private function contactByZaloUserId(string $threadUid): ?Contact
    {
        return $this->inbox->account->contacts()
            ->whereRaw("additional_attributes ->> 'social_zalo_user_id' = ?", [$threadUid])
            ->first();
    }

    /**
     * Builder lõi chỉ ghi tên / ảnh đại diện / số điện thoại lúc TẠO hồ sơ (đúng
     * gốc: `contact_inbox_with_contact_builder.rb` trả về sớm theo `source_id`).
     * Kênh nào cần làm mới thì tự làm trong driver của mình — gốc cũng chỉ có
     * Telegram làm, với ảnh đại diện.
     */
    private function syncContactProfile(ContactInbox $contactInbox, string $threadUid): void
    {
        $contact = $contactInbox->contact;

        if ($contact === null) {
            return;
        }

        $this->refreshDisplayProfile($contact, $threadUid);

        if ($this->fillPhoneNumber($contact)) {
            // Gộp hồ sơ đã dời contact_inbox sang hồ sơ giữ lại — bản trong bộ
            // nhớ còn trỏ về hồ sơ vừa bị xóa.
            $contactInbox->refresh();
        }
    }

    private function refreshDisplayProfile(Contact $contact, string $threadUid): void
    {
        $user = is_array($this->params['user'] ?? null) ? $this->params['user'] : [];

        // Lô lịch sử không kèm hồ sơ nên liên hệ tạo từ backfill không có ảnh;
        // builder chỉ thử đúng một lần lúc tạo, tin sau vẫn mang `user.avatar`.
        app(ZaloContactProfile::class)->refresh(
            $contact,
            $threadUid,
            filled($user['name'] ?? null) ? (string) $user['name'] : null,
            filled($user['avatar'] ?? null) ? (string) $user['avatar'] : null,
            $this->isGroupThread(),
        );
    }

    /**
     * Chỉ ĐIỀN KHI TRỐNG — không đè số agent nhập tay. Số đã thuộc hồ sơ khác
     * trong cùng account nghĩa là hai nguồn của MỘT người: đi qua
     * `ContactMergeAction` của lõi theo luật chống trùng số điện thoại, KHÔNG
     * update thẳng (`contacts.phone_number` không có unique index nên update
     * thẳng đẻ ra hai hồ sơ trùng số một cách im lặng).
     *
     * @return bool hồ sơ đã bị gộp hay chưa
     */
    private function fillPhoneNumber(Contact $contact): bool
    {
        $phone = $this->phoneNumber();

        if ($phone === null || filled($contact->phone_number)) {
            return false;
        }

        $owner = $contact->account->contacts()
            ->where('phone_number', $phone)
            ->whereKeyNot($contact->getKey())
            ->first();

        if ($owner === null) {
            $contact->update(['phone_number' => $phone]);

            return false;
        }

        (new ContactMergeAction(account: $contact->account, baseContact: $owner, mergeeContact: $contact))->perform();

        return true;
    }

    /**
     * Số của NGƯỜI GỬI, không phải số in trên thẻ. Danh thiếp Zalo là thẻ của
     * người thứ ba (bridge lấy số qua `getUserInfo(contact_uid)` — uid TRÊN
     * thiếp), gán số đó cho người gửi là gộp nhầm hai con người; số trên thiếp
     * vẫn nằm nguyên trong `content_attributes.business_card`. Chỉ khi thiếp
     * chính là thiếp của người gửi (`contact_uid` = uid hội thoại) thì số đó mới
     * là số của họ.
     */
    private function phoneNumber(): ?string
    {
        $card = is_array($this->params['business_card'] ?? null) ? $this->params['business_card'] : [];
        $threadUid = (string) ($this->params['peer_uid'] ?? $this->params['thread_id'] ?? '');
        $cardIsSelf = $threadUid !== '' && (string) ($card['contact_uid'] ?? '') === $threadUid;

        return self::toE164($this->params['user']['phone'] ?? ($cardIsSelf ? $card['phone'] ?? null : null));
    }

    // Zalo trả số nội địa (`0901234567`, `84901234567`). Số trần không rõ tiền
    // tố thì bỏ chứ không đoán mã nước — đoán sai là gộp nhầm hồ sơ.
    private static function toE164(mixed $phone): ?string
    {
        return is_scalar($phone) ? PhoneNumber::normalize((string) $phone, acceptBareNationalNumber: false) : null;
    }

    private function direction(): string
    {
        $direction = $this->params['direction'] ?? 'in';

        // Thiếu/lạ → coi là tin đến: thà đếm thiếu tin tenant gửi còn hơn đếm nhầm.
        return in_array($direction, ['in', 'out', 'echo'], true) ? $direction : 'in';
    }

    private function sticker(): ?StickerContent
    {
        $customSticker = $this->customSticker();

        if ($customSticker !== null) {
            return new StickerContent(
                id: $customSticker->contentId ?? (string) $this->params['source_id'],
                imageUrl: $customSticker->webpUrl,
                extra: $customSticker->payload(),
            );
        }

        if (! $this->isPlatformSticker()) {
            return null;
        }

        $sticker = (array) $this->params['sticker'];

        return new StickerContent(
            id: $sticker['id'],
            imageUrl: $this->firstFilled($sticker, self::STICKER_URL_KEYS),
            packId: $sticker['catId'] ?? $sticker['cateId'] ?? null,
            extra: $sticker,
        );
    }

    private function isPlatformSticker(): bool
    {
        return ($this->params['inbound_kind'] ?? null) === self::STICKER_KIND
            && filled($this->params['sticker']['id'] ?? null);
    }

    private function customSticker(): ?ZaloCustomSticker
    {
        if (! $this->customStickerParsed) {
            $this->customSticker = ZaloCustomSticker::fromZcaMessage($this->params['listener_data'] ?? null);
            $this->customStickerParsed = true;
        }

        return $this->customSticker;
    }

    /**
     * @param  array<string, mixed>  $values
     * @param  list<string>  $keys
     */
    private function firstFilled(array $values, array $keys): ?string
    {
        foreach ($keys as $key) {
            if (filled($values[$key] ?? null)) {
                return (string) $values[$key];
            }
        }

        return null;
    }

    /**
     * Thẻ riêng của Zalo (danh thiếp / thẻ ngân hàng / nhắc hẹn / cuộc gọi) —
     * bóc một lần rồi dùng lại cho cả `content` lẫn `content_attributes`.
     *
     * @return array{kind: string, data: array<string, mixed>}|null
     */
    private function card(): ?array
    {
        if (! $this->cardParsed) {
            $this->card = InboundCardParser::parse($this->params);
            $this->cardParsed = true;
        }

        return $this->card;
    }

    private function content(): ?string
    {
        $content = $this->params['content'] ?? null;
        $card = $this->card();

        if ($card === null) {
            return blank($content) ? null : (string) $content;
        }

        // Nhắc hẹn: chuỗi bridge dựng là link ảnh thô ("[Link] ⏰ … .png"), không
        // phải chữ khách gõ — bỏ, lấy tiêu đề thẻ. Các thẻ khác giữ chú thích
        // đi kèm nếu có, thiếu thì dùng nhãn dịch để danh sách không hiện rỗng.
        return blank($content) || $card['kind'] === 'reminder'
            ? InboundCardParser::label($card['kind'], $card['data'], $this->inbox->account->locale)
            : (string) $content;
    }

    /** @return array<string, mixed> */
    private function contentAttributes(Conversation $conversation): array
    {
        $attributes = [];

        $card = $this->card();

        if ($card !== null) {
            $attributes[$card['kind']] = $card['data'];
        }

        $zcaMessage = $this->zcaMessage();

        if ($zcaMessage !== []) {
            $attributes['zca_message'] = $zcaMessage;
        }

        // Tin nhóm: ai gửi, nhắc tên ai, thuộc nhóm nào — bong bóng lõi đọc khoá
        // chuẩn hoá này (docs/channel-capabilities.md §2.4 `group_threads`).
        $attributes = [...$attributes, ...$this->groupContext()];

        $quote = $this->params['quote'] ?? null;

        if (filled($quote)) {
            $attributes['quote'] = $quote;
            $quotedSourceId = $this->quotedSourceId($conversation, is_array($quote) ? $quote : []);

            if ($quotedSourceId !== null) {
                $attributes['in_reply_to_external_id'] = $quotedSourceId;
            }

            $preview = self::replyPreview(is_array($quote) ? $quote : []);

            if ($preview !== []) {
                $attributes['in_reply_to_preview'] = $preview;
            }
        }

        if ($this->direction() !== 'in') {
            // `outgoing_echo` của gốc: tin do chính chủ shop gửi thẳng từ ứng dụng Zalo
            // hoặc do CRM đẩy lại. Thiếu cờ này thì lõi không coi là "đã trả
            // lời" — mốc chờ, first_reply, SLA và báo cáo đều sai.
            $attributes['external_echo'] = true;
        }

        return $attributes;
    }

    /**
     * Nhóm gom nhiều người vào MỘT hội thoại, nên người gửi thật đi theo từng tin
     * thay vì theo hồ sơ liên hệ. Chỉ giữ đúng khoá của chuẩn năng lực — payload
     * bridge còn `sender_uid`, `thread.type`… nhưng lõi không cần và không được
     * học tên riêng của nền tảng.
     *
     * @return array<string, mixed>
     */
    private function groupContext(): array
    {
        if (! $this->isGroupThread()) {
            return [];
        }

        $context = [];

        $sender = self::pick($this->params['sender'] ?? null, self::GROUP_SENDER_KEYS);

        if (filled($sender['name'] ?? null) || filled($sender['external_id'] ?? null)) {
            $context['sender'] = $sender;
        }

        $thread = self::pick($this->params['thread'] ?? null, self::GROUP_THREAD_KEYS);

        if (filled($thread['id'] ?? null)) {
            $context['thread'] = $thread;
        }

        $mentions = array_values(array_filter(
            array_map(
                fn ($mention) => self::neutralMention(self::pick($mention, self::GROUP_MENTION_KEYS)),
                is_array($this->params['mentions'] ?? null) ? $this->params['mentions'] : [],
            ),
            fn (array $mention) => filled($mention['name'] ?? null),
        ));

        if ($mentions !== []) {
            $context['mentions'] = $mentions;
        }

        return $context;
    }

    /**
     * @param  array<string, mixed>  $mention
     * @return array<string, mixed>
     */
    private static function neutralMention(array $mention): array
    {
        if ((string) ($mention['external_id'] ?? '') === Zalo::MENTION_EVERYONE_UID) {
            $mention['external_id'] = OutboundMentionsBuilder::EVERYONE;
        }

        return $mention;
    }

    private function isGroupThread(): bool
    {
        return (int) ($this->params['thread_type'] ?? 0) === Zalo::THREAD_TYPE_GROUP;
    }

    /**
     * @param  list<string>  $keys
     * @return array<string, mixed>
     */
    private static function pick(mixed $source, array $keys): array
    {
        if (! is_array($source)) {
            return [];
        }

        return array_filter(
            array_intersect_key($source, array_flip($keys)),
            fn ($value) => $value !== null && $value !== '',
        );
    }

    /**
     * Ảnh chụp gọn của tin gốc phía zca — vừa đủ dựng `SendMessageQuote` chiều ra,
     * vừa là chỗ tra `cliMsgId` khi khách trích dẫn tin này.
     *
     * @return array<string, mixed>
     */
    private function zcaMessage(): array
    {
        $listenerData = is_array($this->params['listener_data'] ?? null) ? $this->params['listener_data'] : [];

        $snapshot = [];

        foreach (self::ZCA_QUOTE_FIELDS as $field) {
            if (($listenerData[$field] ?? null) !== null) {
                $snapshot[$field] = $listenerData[$field];
            }
        }

        return $snapshot;
    }

    private function backfillZcaMessage(Message $message): void
    {
        $snapshot = $this->zcaMessage();

        if ($snapshot === [] || ($message->content_attributes['zca_message'] ?? null) === $snapshot) {
            return;
        }

        $message->updateQuietly([
            'content_attributes' => [...$message->content_attributes ?? [], 'zca_message' => $snapshot],
        ]);
    }

    /**
     * Zalo trỏ tin được trích dẫn bằng `cliMsgId` (định danh phía CLIENT), không
     * phải `msgId` mà ta lưu ở `source_id`. Quy đổi ngay tại driver để lõi chỉ
     * nhận đúng một thứ nó hiểu: `in_reply_to_external_id` = source_id.
     *
     * @param  array<string, mixed>  $quote
     */
    private function quotedSourceId(Conversation $conversation, array $quote): ?string
    {
        $candidates = array_values(array_unique(array_filter([
            $this->params['quote_msg_id'] ?? null,
            $quote['msg_id'] ?? null,
            $quote['msgId'] ?? null,
            $quote['cli_msg_id'] ?? null,
        ], fn ($value) => filled($value))));

        foreach ($candidates as $candidate) {
            $candidate = (string) $candidate;

            if ($conversation->messages()->where('source_id', $candidate)->exists()) {
                return $candidate;
            }

            $byClientId = $conversation->messages()
                ->whereRaw("content_attributes #>> '{zca_message,cliMsgId}' = ?", [$candidate])
                ->value('source_id');

            if (filled($byClientId)) {
                return (string) $byClientId;
            }
        }

        return null;
    }

    /**
     * Ảnh chụp tin được trích dẫn theo khoá trung tính `in_reply_to_preview` — bong
     * bóng dùng khi tin gốc không có trong Yona (gửi trước khi kết nối) hoặc chưa
     * tải. `quote` thô vẫn giữ để tương thích, nhưng lõi và giao diện không đọc nó.
     *
     * @param  array<string, mixed>  $quote
     * @return array{content?: string, sender_name?: string, attachment_type?: string}
     */
    private static function replyPreview(array $quote): array
    {
        $content = is_string($quote['text'] ?? null) ? trim($quote['text']) : '';
        $senderName = $quote['sender_name'] ?? data_get($quote, 'sender.name');

        return array_filter([
            'content' => $content === '' ? null : mb_substr($content, 0, self::REPLY_PREVIEW_MAX_LENGTH),
            'sender_name' => is_string($senderName) && trim($senderName) !== '' ? trim($senderName) : null,
            'attachment_type' => self::QUOTE_ATTACHMENT_TYPES[$quote['msg_type'] ?? '']
                ?? self::QUOTE_ATTACHMENT_TYPES_BY_CLIENT_TYPE[(int) ($quote['cli_msg_type'] ?? 0)]
                ?? null,
        ], fn ($value) => $value !== null);
    }

    /** @return list<Attachment> */
    private function buildAttachments(int $accountId): array
    {
        $spec = $this->attachmentSpec();

        return $spec === null ? [] : [app(InboundAttachmentFactory::class)->build($spec, $accountId)];
    }

    /**
     * Sticker nền tảng và sticker tự tạo có WebP: ảnh do StickerMessage dựng từ URL CDN,
     * không tải; chỉ sticker tự tạo chỉ có JPG đi tiếp đường tải như ảnh thường.
     *
     * Vị trí vào contract đính kèm `location` của lõi. Xem trước liên kết KHÔNG đi
     * đường đính kèm mà ở `content_attributes.link_preview` (một nguồn duy nhất).
     *
     * URL CDN Zalo có hạn dùng, lô lịch sử hay về sau khi token đã hết: tải hỏng thì
     * lõi giữ fallback có liên kết để tự tải lại nền.
     */
    private function attachmentSpec(): ?InboundAttachment
    {
        if ($this->sticker()?->imageUrl !== null) {
            return null;
        }

        $kind = (string) ($this->params['inbound_kind'] ?? 'file');

        if ($kind === self::LOCATION_KIND) {
            return $this->locationSpec();
        }

        if ($kind === 'business_card') {
            return $this->businessCardSpec();
        }

        $url = $this->params['media_url'] ?? null;

        if (blank($url)) {
            return null;
        }

        return InboundAttachment::download(
            (string) $url,
            self::ATTACHMENT_KINDS[$kind] ?? AttachmentKind::File,
            $this->params['media_filename'] ?? null,
            urlIsPublic: true,
        );
    }

    /**
     * Danh thiếp Zalo giữ thẻ riêng ở `content_attributes.business_card` cho bong bóng
     * của nó, và thêm đính kèm `contact` theo hình dạng chung của lõi (cùng loại với
     * Telegram, WhatsApp) để mọi nơi đọc danh thiếp không phải biết kênh.
     */
    private function businessCardSpec(): ?InboundAttachment
    {
        $card = is_array($this->params['business_card'] ?? null) ? $this->params['business_card'] : [];
        $title = $card['phone'] ?? $card['name'] ?? $card['title'] ?? null;

        return blank($title) ? null : InboundAttachment::contactCard((string) $title, array_filter([
            'first_name' => $card['name'] ?? $card['title'] ?? null,
            'url' => $card['url'] ?? null,
            'avatar_url' => $card['thumbnail'] ?? null,
        ]));
    }

    private function locationSpec(): ?InboundAttachment
    {
        $location = is_array($this->params['location'] ?? null) ? $this->params['location'] : [];
        $latitude = $location['latitude'] ?? $location['lat'] ?? null;
        $longitude = $location['longitude'] ?? $location['long'] ?? $location['lng'] ?? null;

        if (! is_numeric($latitude) || ! is_numeric($longitude)) {
            return null;
        }

        $title = implode(', ', array_filter(
            [$location['title'] ?? null, $location['address'] ?? null],
            fn ($value) => filled($value),
        ));

        return InboundAttachment::location((float) $latitude, (float) $longitude, $title === '' ? null : $title, $location['url'] ?? null);
    }
}
