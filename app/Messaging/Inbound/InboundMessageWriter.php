<?php

namespace App\Messaging\Inbound;

use App\Builders\ContactInboxWithContactBuilder;
use App\Messaging\Stickers\StickerMessage;
use App\Models\Attachment;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Channels\IncomingConversationResolver;
use Illuminate\Support\Facades\DB;

/**
 * Nơi duy nhất ghi một tin đến (hoặc tin dội lại) của mọi kênh vào lõi:
 *   - chống trùng theo inbox + source_id (kể cả bí danh `external_source_ids` của tin dội lại);
 *   - liên hệ qua ContactInboxWithContactBuilder, hội thoại qua IncomingConversationResolver;
 *   - Message: content, loại/trạng thái theo chiều, trích dẫn (`in_reply_to_external_id` +
 *     `in_reply_to_preview`; id nội bộ do lõi tự suy lúc lưu), chuyển tiếp, `external_echo`;
 *   - đính kèm dựng TRƯỚC khi lưu để `message.created` phát ra đã có đính kèm;
 *   - sticker đi qua StickerMessage; `platform_sent_at` theo giờ nền tảng, `created_at` là giờ nhận;
 *   - thu hồi tới trước tin được áp ngay sau khi lưu.
 *
 * Driver không dựng Message/Attachment nữa; đặc thù chỉ còn ở cách bóc payload.
 */
class InboundMessageWriter
{
    public function __construct(
        private readonly InboundAttachmentFactory $attachments,
        private readonly MessageEventService $events,
    ) {}

    public function write(Inbox $inbox, InboundSender $sender, InboundMessage $inbound): ?Message
    {
        if ($this->isDuplicate($inbox, $inbound)) {
            return null;
        }

        $contactInbox = (new ContactInboxWithContactBuilder(
            inbox: $inbox,
            contactAttributes: $sender->contactAttributes(),
            sourceId: $sender->sourceId,
        ))->perform();

        if ($contactInbox === null) {
            return null;
        }

        return DB::transaction(function () use ($inbox, $contactInbox, $inbound) {
            $conversation = IncomingConversationResolver::resolve($contactInbox, $inbound->conversationAttributes);

            $message = $conversation->messages()->make([
                'account_id' => $inbox->account_id,
                'inbox_id' => $inbox->id,
                'content' => $inbound->text,
                'content_type' => Message::CONTENT_TYPES['text'],
                'message_type' => $inbound->direction->messageType(),
                'status' => $inbound->direction->status(),
                'source_id' => $inbound->sourceId,
                'content_attributes' => $this->contentAttributes($inbound),
            ]);

            if ($inbound->direction === InboundDirection::Incoming) {
                $message->sender()->associate($contactInbox->contact);
            }

            $message->pendingAttachments = array_map(
                fn (InboundAttachment $spec) => $this->attachments->build($spec, $inbox->account_id),
                $inbound->attachments,
            );

            if ($inbound->sticker !== null) {
                StickerMessage::apply($message, $inbound->sticker, $this->downloadedStickerImage($message, $inbound));
            }

            // Thứ tự theo giờ nền tảng; `created_at` vẫn là giờ nhận (chưa đọc, mốc hoạt động).
            // Mốc rác (0, âm) hay đồng hồ điện thoại chạy trước thì lấy giờ máy chủ.
            if ($inbound->sentAt !== null && $inbound->sentAt->year >= 2000 && ! $inbound->sentAt->isFuture()) {
                $message->platform_sent_at = $inbound->sentAt;
            }

            $message->save();

            // Thu hồi có thể tới trước tin nó nói đến.
            $this->events->applyPendingRecall($inbox, $inbound->sourceId);

            return $message;
        });
    }

    /** @return array<string, mixed> */
    private function contentAttributes(InboundMessage $inbound): array
    {
        return array_filter([
            ...$inbound->attributes,
            ...($inbound->replyTo?->attributes() ?? []),
            'forwarded_from' => $inbound->forwardedFrom?->payload(),
            'external_echo' => $inbound->isEcho() ? true : null,
        ], fn ($value) => $value !== null);
    }

    /**
     * Sticker có ảnh trên URL cần tải: kênh đưa ảnh vào `attachments`, lõi lấy ảnh đầu.
     * Tải hỏng thì đính kèm là fallback — vẫn giữ để tin còn hiện và còn đường tải lại.
     */
    private function downloadedStickerImage(Message $message, InboundMessage $inbound): ?Attachment
    {
        if ($inbound->sticker?->imageUrl !== null) {
            return null;
        }

        foreach ($message->pendingAttachments as $attachment) {
            if ($attachment->file_type === Attachment::FILE_TYPE_IMAGE) {
                return $attachment;
            }
        }

        return $message->pendingAttachments[0] ?? null;
    }

    /**
     * `source_id` là định danh của nền tảng trên cả kênh: tra theo inbox, không theo hội
     * thoại, kẻo tin cũ kéo về sau khi nối lại chui sang hội thoại mới của cùng liên hệ.
     */
    private function isDuplicate(Inbox $inbox, InboundMessage $inbound): bool
    {
        if (blank($inbound->sourceId)) {
            return false;
        }

        $query = Message::query()->where('inbox_id', $inbox->id);

        if ($query->clone()->where('source_id', $inbound->sourceId)->exists()) {
            return true;
        }

        // Bí danh chỉ có trên tin do chính hệ thống gửi đi, và phép tra JSON chưa có
        // index đỡ — chỉ trả giá cho tin dội lại.
        return $inbound->isEcho()
            && $query->whereRaw("jsonb_exists((content_attributes)::jsonb -> 'external_source_ids', ?)", [$inbound->sourceId])->exists();
    }
}
