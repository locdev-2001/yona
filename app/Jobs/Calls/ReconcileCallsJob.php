<?php

namespace App\Jobs\Calls;

use App\Jobs\ApplicationJob;
use App\Services\Calls\CallReconciler;

// Mỗi phút đối soát các phòng đang mở với nhà cung cấp media (bù webhook bị mất).
class ReconcileCallsJob extends ApplicationJob
{
    public function __construct()
    {
        $this->onQueue('scheduled_jobs');
    }

    public function handle(CallReconciler $reconciler): void
    {
        $reconciler->reconcileOpenCalls();
    }
}
