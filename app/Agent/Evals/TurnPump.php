<?php

namespace App\Agent\Evals;

use Illuminate\Contracts\Queue\ClearableQueue;
use Illuminate\Contracts\Queue\Factory as QueueFactory;
use Illuminate\Queue\Worker;
use Illuminate\Queue\WorkerOptions;
use RuntimeException;

// Chạy lượt AI ngay trong tiến trình eval: tin khách đẩy job agent lên một hàng đợi riêng
// không worker nào nghe (Kernel đặt tên), và pump rút cạn hàng đợi đó bằng đúng Worker của
// Laravel — cùng job, middleware và xử lý lỗi như production, chỉ bỏ cửa sổ im lặng.
final class TurnPump
{
    private const MAX_WAIT_SECONDS = 300;

    public function __construct(
        private readonly Worker $worker,
        private readonly QueueFactory $queues,
        private readonly ?string $connection,
        private readonly string $queue,
    ) {}

    public function drain(): void
    {
        $connection = $this->queues->connection($this->connection);
        $connectionName = $connection->getConnectionName();
        $options = new WorkerOptions(name: 'agent-eval', sleep: 1, maxTries: 1);
        $deadline = microtime(true) + self::MAX_WAIT_SECONDS;

        while ($connection->size($this->queue) > 0) {
            if (microtime(true) > $deadline) {
                throw new RuntimeException("Agent jobs on queue {$this->queue} did not finish within ".self::MAX_WAIT_SECONDS.' seconds.');
            }

            $this->worker->runNextJob($connectionName, $this->queue, $options);
        }
    }

    public function clear(): void
    {
        $connection = $this->queues->connection($this->connection);

        if ($connection instanceof ClearableQueue) {
            $connection->clear($this->queue);
        }
    }
}
