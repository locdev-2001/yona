<?php

namespace App\Jobs\Messages;

use App\Jobs\ApplicationJob;
use App\Models\Message;
use App\Services\LinkPreviews\LinkPreviewBuilder;

/**
 * Dựng thẻ xem trước liên kết sau khi tin đã lưu, ngoài luồng nhận/gửi tin. Ghi vào
 * `content_attributes` làm tin phát `message.updated`, giao diện vẽ lại thành thẻ.
 */
class BuildLinkPreviewJob extends ApplicationJob
{
    public int $tries = 1;

    public function __construct(public readonly int $messageId)
    {
        $this->onQueue('low');
    }

    public function handle(LinkPreviewBuilder $builder): void
    {
        $message = Message::query()->find($this->messageId);

        if ($message === null || ! $builder->wantsPreview($message)) {
            return;
        }

        $preview = $builder->previewFor($message);

        if ($preview === null) {
            return;
        }

        $message->refresh();
        $message->update([
            'content_attributes' => [...($message->content_attributes ?? []), LinkPreviewBuilder::ATTRIBUTE => $preview],
        ]);
    }
}
