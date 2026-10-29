<?php

namespace App\Listeners;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Jobs\Messages\BuildLinkPreviewJob;
use App\Services\LinkPreviews\LinkPreviewBuilder;

// Mọi tin mới có liên kết, ở mọi kênh và cả hai chiều, được hẹn dựng thẻ xem trước.
class LinkPreviewListener
{
    public function __construct(private readonly LinkPreviewBuilder $builder) {}

    public function handle(DomainEvent $event): void
    {
        if ($event->type !== EventType::MESSAGE_CREATED) {
            return;
        }

        $message = $event->data['message'];

        if ($this->builder->wantsPreview($message)) {
            BuildLinkPreviewJob::dispatch($message->id);
        }
    }
}
