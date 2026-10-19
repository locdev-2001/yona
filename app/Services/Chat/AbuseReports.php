<?php

namespace App\Services\Chat;

use App\Models\AbuseReport;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;

// Người dùng báo cáo vi phạm; Super Admin xử lý.
class AbuseReports
{
    /** @throws ModelNotFoundException */
    public function report(User $reporter, string $type, int|string $id, string $reason, ?string $note): AbuseReport
    {
        $modelClass = AbuseReport::REPORTABLE[$type];
        $target = $modelClass::query()->where((new $modelClass)->getRouteKeyName(), $id)->firstOrFail();

        return AbuseReport::query()->create([
            'reporter_id' => $reporter->getKey(),
            'reportable_type' => $type,
            'reportable_id' => $target->getKey(),
            'reason' => $reason,
            'note' => $note,
            'status' => AbuseReport::STATUS_OPEN,
        ]);
    }

    public function resolve(AbuseReport $report, User $handler, int $status): void
    {
        $report->update(['status' => $status, 'handled_by' => $handler->getKey(), 'handled_at' => now()]);
    }
}
