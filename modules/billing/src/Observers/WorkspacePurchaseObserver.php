<?php

namespace Modules\Billing\Observers;

use Modules\Billing\Models\WorkspacePurchase;
use Modules\Billing\Services\EntitlementResolver;

/**
 * Xóa cache entitlements khi purchase thay đổi (saved/deleted).
 * EntitlementResolver cache limits-only — phải invalidate khi gói đổi.
 */
class WorkspacePurchaseObserver
{
    public function __construct(private readonly EntitlementResolver $resolver) {}

    public function saved(WorkspacePurchase $purchase): void
    {
        $this->resolver->forgetCache($purchase->workspace_id);
    }

    public function deleted(WorkspacePurchase $purchase): void
    {
        $this->resolver->forgetCache($purchase->workspace_id);
    }
}
