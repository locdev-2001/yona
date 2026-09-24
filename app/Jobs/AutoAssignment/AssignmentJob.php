<?php

namespace App\Jobs\AutoAssignment;

use App\Jobs\ApplicationJob;
use App\Models\Inbox;
use App\Services\AutoAssignment\AssignmentService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;
use Throwable;

// Khóa AUTO_ASSIGNMENT_IN_FLIGHT_KEY chặn hai lượt giao cùng chạy.
class AssignmentJob extends ApplicationJob
{
    public const IN_FLIGHT_TTL_SECONDS = 300;

    public const AUTO_ASSIGNMENT_IN_FLIGHT_KEY = 'AUTO_ASSIGNMENT_IN_FLIGHT::%d';

    public function __construct(
        public readonly int $inboxId,
        public readonly ?string $token = null,
    ) {
        $this->onQueue('default');
    }

    // Gộp các lượt kích hoạt dồn dập của cùng một inbox: mỗi lúc chỉ một job
    // đang chờ/đang chạy. Marker mang token để job chỉ nhả đúng phần của mình
    // (job mới có thể đã giành lại sau khi TTL hết).
    public static function enqueueForInbox(int $inboxId): bool
    {
        $key = self::inFlightKey($inboxId);
        $token = (string) Str::uuid();

        if (! Redis::set($key, $token, 'EX', self::IN_FLIGHT_TTL_SECONDS, 'NX')) {
            return false;
        }

        try {
            self::dispatch($inboxId, $token);
        } catch (Throwable $exception) {
            self::releaseInFlight($inboxId, $token);

            throw $exception;
        }

        return true;
    }

    public function handle(): void
    {
        try {
            $inbox = Inbox::query()->find($this->inboxId);

            if ($inbox === null) {
                return;
            }

            $assignedCount = (new AssignmentService($inbox))->performBulkAssignment($this->bulkAssignmentLimit());
            Log::info("Assigned {$assignedCount} conversations for inbox {$inbox->id}");
        } catch (Throwable $exception) {
            Log::error("Bulk assignment failed for inbox {$this->inboxId}: {$exception->getMessage()}");

            throw $exception;
        } finally {
            self::releaseInFlight($this->inboxId, $this->token);
        }
    }

    // Chỉ nhả marker khi còn là của mình — so sánh rồi xóa trong một lệnh để job
    // đã hết TTL không xóa nhầm marker của job mới hơn.
    private static function releaseInFlight(int $inboxId, ?string $token): void
    {
        if ($token === null) {
            return;
        }

        Redis::eval(
            'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
            1,
            self::inFlightKey($inboxId),
            $token,
        );
    }

    private static function inFlightKey(int $inboxId): string
    {
        return sprintf(self::AUTO_ASSIGNMENT_IN_FLIGHT_KEY, $inboxId);
    }

    private function bulkAssignmentLimit(): int
    {
        return (int) env('AUTO_ASSIGNMENT_BULK_LIMIT', 100);
    }
}
