<?php

namespace App\Agent\Boundary\Inbound;

use App\Agent\Contracts\Ports\StimulusSink;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;

// Dịch tin lõi thành kích thích ngoài luồng request; chỉ mang id, đọc lại khi chạy.
final class MapDomainEventJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public int $tries = 3;

    public function __construct(
        public readonly int $accountId,
        public readonly int $conversationId,
        public readonly int $messageId,
        public readonly int $occurredAt,
    ) {}

    public function handle(StimulusMapper $mapper, StimulusSink $sink): void
    {
        $stimulus = $mapper->customerMessage($this->accountId, $this->conversationId, $this->messageId, $this->occurredAt);

        if ($stimulus !== null) {
            $sink->accept($stimulus);
        }
    }
}
