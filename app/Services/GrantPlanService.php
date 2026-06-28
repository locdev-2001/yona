<?php

namespace App\Services;

use App\Models\MarketplaceItem;
use App\Models\WorkspacePurchase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * GrantPlanService — single source of truth cho admin cấp/thu hồi gói tay.
 *
 * grant(): tạo hoặc cập nhật workspace_purchase status=active (idempotent).
 * revoke(): set status=cancelled → observer forget cache → entitlements đổi live.
 *
 * Dùng pgsql_privileged để bypass RLS WITH CHECK — giống grantFreePlan()
 * trong BillingServiceProvider (admin không bind workspace context).
 *
 * Observer WorkspacePurchaseObserver tự gọi forgetCache() khi purchase saved/deleted
 * → entitlements phản ánh gói mới ngay sau khi grant/revoke.
 */
class GrantPlanService
{
    /**
     * Cấp gói cho workspace (idempotent — 1 active purchase/item/workspace).
     *
     * @param  array{quantity?: int, current_period_end?: string|null, external_ref?: string|null}  $opts
     */
    public function grant(string $workspaceId, string $itemCode, array $opts = []): WorkspacePurchase
    {
        $item = MarketplaceItem::where('code', $itemCode)->where('is_active', true)->firstOrFail();

        // updateOrCreate qua privileged connection để bypass RLS WITH CHECK.
        // Tìm theo workspace_id + item_id (unique business key per item per workspace).
        $db = DB::connection('pgsql_privileged');

        $existing = $db->table('workspace_purchases')
            ->where('workspace_id', $workspaceId)
            ->where('item_id', $item->id)
            ->first();

        $now = now();
        $periodEnd = $opts['current_period_end'] ?? null;

        if ($existing) {
            $db->table('workspace_purchases')
                ->where('id', $existing->id)
                ->update([
                    'status' => 'active',
                    'quantity' => $opts['quantity'] ?? $existing->quantity,
                    'current_period_end' => $periodEnd,
                    'external_ref' => $opts['external_ref'] ?? $existing->external_ref,
                    'updated_at' => $now,
                ]);

            app(EntitlementService::class)->forgetCache($workspaceId);

            // Build model từ data (không query lại qua RLS — không có workspace context)
            $purchase = new WorkspacePurchase;
            $purchase->id = $existing->id;
            $purchase->workspace_id = $workspaceId;
            $purchase->item_id = $item->id;
            $purchase->status = 'active';
            $purchase->quantity = $opts['quantity'] ?? (int) $existing->quantity;
            $purchase->exists = true;

            return $purchase;
        }

        $id = (string) Str::orderedUuid();
        $db->table('workspace_purchases')->insert([
            'id' => $id,
            'workspace_id' => $workspaceId,
            'item_id' => $item->id,
            'status' => 'active',
            'quantity' => $opts['quantity'] ?? 1,
            'current_period_end' => $periodEnd,
            'external_ref' => $opts['external_ref'] ?? null,
            'lock_version' => 0,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        app(EntitlementService::class)->forgetCache($workspaceId);

        // Build model từ data (không query lại qua RLS — privileged insert không có context)
        $purchase = new WorkspacePurchase;
        $purchase->id = $id;
        $purchase->workspace_id = $workspaceId;
        $purchase->item_id = $item->id;
        $purchase->status = 'active';
        $purchase->quantity = $opts['quantity'] ?? 1;
        $purchase->exists = true;

        return $purchase;
    }

    /**
     * Thu hồi gói (set cancelled).
     * Idempotent: nếu không tìm thấy thì không làm gì.
     */
    public function revoke(string $workspaceId, string $itemCode): ?WorkspacePurchase
    {
        $item = MarketplaceItem::where('code', $itemCode)->where('is_active', true)->first();

        if (! $item) {
            return null;
        }

        // F2-audit: đọc qua pgsql_privileged (bypass RLS) — giống grant().
        $db = DB::connection('pgsql_privileged');

        $existing = $db->table('workspace_purchases')
            ->where('workspace_id', $workspaceId)
            ->where('item_id', $item->id)
            ->where('status', 'active')
            ->first();

        if (! $existing) {
            return null;
        }

        $db->table('workspace_purchases')
            ->where('id', $existing->id)
            ->update(['status' => 'cancelled', 'updated_at' => now()]);

        app(EntitlementService::class)->forgetCache($workspaceId);

        // Build model từ data (không query lại qua RLS — không có workspace context)
        $purchase = new WorkspacePurchase;
        $purchase->id = $existing->id;
        $purchase->workspace_id = $workspaceId;
        $purchase->item_id = $item->id;
        $purchase->status = 'cancelled';
        $purchase->exists = true;

        return $purchase;
    }
}
