<?php

namespace App\Agent\Runtime;

use App\Agent\Runtime\Jobs\RunTurnJob;
use App\Agent\ValueObjects\Stimulus;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Bus\Dispatcher;

// Gộp tin dồn: mỗi tin khách hẹn một lượt sau cửa sổ im lặng của kênh; job tỉnh dậy
// thấy đã có tin khách mới hơn thì nhường job của tin đó. Không sleep trong worker.
final class TurnScheduler
{
    public function __construct(
        private readonly Dispatcher $bus,
        private readonly TurnSettings $settings,
    ) {}

    public function schedule(Stimulus $stimulus, string $channel): void
    {
        $order = TurnOrder::from($stimulus);
        $waitUntil = CarbonImmutable::now()->addSeconds($this->settings->debounceFor($channel) + $this->settings->maxWaitSeconds)->getTimestamp();

        $this->bus->dispatch(
            (new RunTurnJob($order, $this->settings->jobTimeoutSeconds, $this->settings->lockReleaseSeconds, $this->settings->lockExpireSeconds, $waitUntil))
                ->onQueue($this->settings->queue)
                ->delay($this->settings->debounceFor($channel)),
        );
    }
}
