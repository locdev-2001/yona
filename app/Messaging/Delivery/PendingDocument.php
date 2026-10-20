<?php

namespace App\Messaging\Delivery;

use App\Exceptions\MessageValidationException;
use App\Models\Attachment;
use App\Models\Message;
use App\Services\Channels\ChannelMessageStatus;
use App\Services\Email\EmailPdf;
use App\Services\Email\EmailPdfRenderer;
use App\Services\Messages\Forwarding\ForwardBlock;
use App\Services\Messages\Forwarding\ForwardRequirements;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Tệp của tin được dựng lúc gửi, không lúc tạo tin: thư chuyển tiếp sang kênh chat
 * thành PDF ở worker, người bấm Chuyển tiếp không phải chờ Chromium. Tin mang dấu
 * `content_attributes.pending_document` (giao diện hiện thẻ tệp đang dựng); tới lượt
 * gửi, SendReplyJob gọi materialize() trước khi giao cho driver kênh.
 *
 * Hỏng thì tin thành failed, dấu được giữ: bấm Thử lại là dựng lại.
 */
final class PendingDocument
{
    public const KEY = 'pending_document';

    public const KIND_EMAIL_PDF = 'email_pdf';

    public function __construct(private readonly EmailPdfRenderer $renderer) {}

    /** @return array{kind: string, message_id: int, filename: string} */
    public static function emailPdfOf(Message $email): array
    {
        return ['kind' => self::KIND_EMAIL_PDF, 'message_id' => (int) $email->id, 'filename' => EmailPdfRenderer::filenameFor($email)];
    }

    public static function isPending(Message $message): bool
    {
        return is_array($message->content_attributes[self::KEY] ?? null);
    }

    /** True khi tin sẵn sàng giao cho driver (không có gì phải dựng, hoặc dựng xong). */
    public function materialize(Message $message): bool
    {
        if (! self::isPending($message)) {
            return true;
        }

        $copies = [];

        try {
            $source = Message::query()->findOrFail((int) $message->content_attributes[self::KEY]['message_id']);
            $pdf = $this->renderer->render($source);
            $copies[] = Attachment::storeContents($pdf->contents, $pdf->filename, EmailPdf::CONTENT_TYPE, $message->account_id);
            $this->copySourceFilesOutside($source, $pdf, $copies);

            DB::transaction(function () use ($message, $copies) {
                foreach ($copies as $copy) {
                    $attachment = $message->attachments()->make($copy);
                    ChannelAttachmentLimit::assertFits($message->inbox, $attachment);
                    $attachment->save();
                }

                // Sự kiện message.updated dựng payload trong hook `updated`: phải nạp lại tệp trước.
                $message->unsetRelation('attachments');
                $attributes = $message->content_attributes;
                unset($attributes[self::KEY]);
                $message->update(['content_attributes' => $attributes]);
            });

            return true;
        } catch (Throwable $exception) {
            Attachment::discardUnattachedCopies($copies);
            $this->fail($message, $exception);

            return false;
        }
    }

    /**
     * Tệp thật của thư đi kèm PDF; ảnh đã nằm trong trang PDF thì không gửi lặp. Ghi
     * thẳng vào $copies để lỗi giữa chừng vẫn dọn được các bản đã sao.
     *
     * @param  list<array<string, mixed>>  $copies
     */
    private function copySourceFilesOutside(Message $source, EmailPdf $pdf, array &$copies): void
    {
        foreach (ForwardRequirements::forwardableAttachments($source) as $attachment) {
            if (in_array((int) $attachment->id, $pdf->embeddedAttachmentIds, true)) {
                continue;
            }

            $copies[] = $attachment->copyStoredFile()
                ?? throw new MessageValidationException(ForwardRequirements::attachmentUnavailable($attachment, $source->account->locale)->message);
        }
    }

    private function fail(Message $message, Throwable $exception): void
    {
        $locale = $message->account->locale;

        if (! $exception instanceof MessageValidationException) {
            report($exception);
        }

        ChannelMessageStatus::fail($message, [
            'code' => ForwardBlock::DOCUMENT_UNAVAILABLE,
            'message' => $exception instanceof MessageValidationException
                ? $exception->getMessage()
                : __('errors.forward.'.ForwardBlock::DOCUMENT_UNAVAILABLE, [], $locale),
        ]);
    }
}
