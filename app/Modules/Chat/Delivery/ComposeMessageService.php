<?php

namespace App\Modules\Chat\Delivery;

use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Message;
use App\Modules\Chat\Delivery\Exception\ComposeMessageException;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Soạn một tin đi ra từ ý định của người dùng — KHÔNG gửi.
 *
 * Đây là phần nghiệp vụ trước đây sống trong `InboxController::send`: chuẩn hóa
 * nội dung, kiểm tin gốc của trích dẫn, dựng địa chỉ tệp, và quyết định tổ hợp
 * nào là hợp lệ. Tách ra để mở cùng tính năng này ra `api.php` chỉ cần thêm một
 * controller mỏng, không chép lại một dòng luật nào (§0.4).
 */
class ComposeMessageService
{
    public function __construct(private readonly MediaUrlFactory $mediaUrls) {}

    /**
     * @throws ModelNotFoundException tin gốc hoặc tệp không thuộc hội thoại này
     * @throws ComposeMessageException tổ hợp nội dung không gửi được
     */
    public function compose(Conversation $conversation, ComposeMessageInput $input): OutboundMessage
    {
        $text = trim((string) $input->text);

        $replyTo = $this->resolveQuotedMessage($conversation, $input, $text);
        $media = $this->resolveMedia($conversation, $input);

        $outbound = new OutboundMessage(
            text: $text !== '' ? $text : null,
            media: $media,
            sticker: $input->sticker,
            replyTo: $replyTo,
        );

        if ($outbound->isEmpty()) {
            throw new ComposeMessageException('Nội dung không được để trống.', 'empty_content');
        }

        return $outbound;
    }

    /**
     * Trả về model chứ không phải id: driver kiểm `instanceof Message` để lấy
     * tham chiếu nền tảng của tin gốc.
     *
     * Hai điều kiện dưới đây kiểm TRƯỚC khi đụng tới tệp, và thứ tự đó là hành vi
     * quan sát được: trích dẫn kèm tệp phải báo "chưa hỗ trợ" kể cả khi cái tệp
     * đó vốn cũng không hợp lệ.
     */
    private function resolveQuotedMessage(Conversation $conversation, ComposeMessageInput $input, string $text): ?Message
    {
        if (empty($input->replyToMessageId)) {
            return null;
        }

        $replyTo = Message::where('id', $input->replyToMessageId)
            ->where('conversation_id', $conversation->id)
            ->firstOrFail();

        if ($text === '') {
            throw new ComposeMessageException('Trả lời trích dẫn cần nội dung text.', 'quote_requires_text');
        }

        // Nhánh gửi tệp của nhà cung cấp không gắn được trích dẫn — khách sẽ không
        // thấy phần trích dù giao diện của ta có hiện. Chặn thẳng thay vì nuốt.
        if (! empty($input->attachmentId)) {
            throw new ComposeMessageException(
                'Chưa hỗ trợ trả lời trích dẫn kèm tệp — gửi tách 2 tin.',
                'quote_with_attachment_unsupported',
            );
        }

        return $replyTo;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function resolveMedia(Conversation $conversation, ComposeMessageInput $input): ?array
    {
        if (empty($input->attachmentId)) {
            return null;
        }

        $attachment = Attachment::where('id', $input->attachmentId)
            ->where('attachable_type', 'conversation')
            ->where('attachable_id', $conversation->id)
            ->firstOrFail();

        return [
            'file_url' => $this->mediaUrls->signedFetchUrl($attachment, $conversation->workspace_id),
            'display_url' => $this->mediaUrls->displayUrl($attachment),
            'media_kind' => $attachment->mediaKind(),
            'filename' => $attachment->original_name,
            'attachment_id' => $attachment->id,
        ];
    }
}
