<?php

namespace App\Observers;

use App\Models\WorkspacePurchase;
use App\Services\EntitlementService;

/**
 * Xóa cache entitlements khi purchase thay đổi (saved/deleted).
 * EntitlementService cache limits-only — phải invalidate khi gói đổi.
 */
class WorkspacePurchaseObserver
{
    public function __construct(private readonly EntitlementService $entitlementService) {}

    public function saved(WorkspacePurchase $purchase): void
    {
        $this->entitlementService->forgetCache($purchase->workspace_id);
    }

    public function deleted(WorkspacePurchase $purchase): void
    {
        $this->entitlementService->forgetCache($purchase->workspace_id);
    }
}
