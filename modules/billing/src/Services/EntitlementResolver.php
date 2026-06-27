<?php

namespace Modules\Billing\Services;

use Illuminate\Support\Facades\Cache;
use Modules\Billing\Models\ChannelUsage;
use Modules\Billing\Models\WorkspacePurchase;

/**
 * EntitlementResolver — tổng hợp quyền từ workspace_purchases active của workspace.
 *
 * Cache: chỉ cache limits (quota tổng) theo workspace_id — KHÔNG cache remaining
 * vì remaining thay đổi theo channel_usage (mỗi meterReply).
 * TTL: 5 phút (EntitlementResolver::CACHE_TTL).
 * Invalidate: WorkspacePurchaseObserver gọi forgetCache() khi purchase changed.
 *
 * Free defaults: workspace không có gói active → trả về gói free mặc định.
 * Gói free defaults cứng trong FREE_DEFAULTS, không query DB để tránh lỗi boot.
 */
class EntitlementResolver
{
    private const CACHE_TTL = 300; // 5 phút

    /**
     * Free defaults khi workspace chưa có purchase active.
     * Phải khớp với PlanSeeder values cho plan.free.
     */
    private const FREE_DEFAULTS = [
        'flags' => ['module.inbox'],
        'quotas' => [
            // PLACEHOLDER — founder chốt số trước launch
            'quota.conversations.zalo_personal' => 50,
            'quota.seats' => 3,
        ],
    ];

    /**
     * Kiểm tra workspace có flag entitlement không (ví dụ 'integration.zalo_personal').
     */
    public function allows(string $workspaceId, string $flag): bool
    {
        $entitlements = $this->resolveEntitlements($workspaceId);

        return in_array($flag, $entitlements['flags'], true);
    }

    /**
     * Giới hạn quota của workspace (trả null nếu không có giới hạn = unlimited).
     * Cache-able vì không đổi cho đến khi purchase thay đổi.
     */
    public function limit(string $workspaceId, string $quotaKey): ?int
    {
        $entitlements = $this->resolveEntitlements($workspaceId);

        return $entitlements['quotas'][$quotaKey] ?? null;
    }

    /**
     * Số hội thoại còn lại trong kỳ hiện tại cho channel.
     * KHÔNG cache (thay đổi mỗi meterReply).
     */
    public function remaining(string $workspaceId, string $quotaKey): int
    {
        $limitValue = $this->limit($workspaceId, $quotaKey);

        if ($limitValue === null) {
            return PHP_INT_MAX; // unlimited
        }

        // Extract channel từ quota key: 'quota.conversations.zalo_personal' → 'zalo_personal'
        $channel = str_replace('quota.conversations.', '', $quotaKey);
        $period = now('Asia/Ho_Chi_Minh')->format('Y-m');

        // Query trực tiếp (bypass RLS global scope vì chạy trong webhook context có scope)
        $used = ChannelUsage::withoutGlobalScope('workspace')
            ->where('workspace_id', $workspaceId)
            ->where('channel', $channel)
            ->where('period', $period)
            ->value('answered_count') ?? 0;

        return max(0, $limitValue - $used);
    }

    /**
     * Snapshot tất cả entitlements cho frontend (Inertia share).
     * Trả về ['flags' => [...], 'quotas' => [...], 'remaining' => [...]].
     */
    public function snapshot(string $workspaceId): array
    {
        $entitlements = $this->resolveEntitlements($workspaceId);

        $remaining = [];
        foreach ($entitlements['quotas'] as $key => $limit) {
            if (str_starts_with($key, 'quota.conversations.')) {
                $remaining[$key] = $this->remaining($workspaceId, $key);
            }
        }

        return [
            'flags' => $entitlements['flags'],
            'quotas' => $entitlements['quotas'],
            'remaining' => $remaining,
        ];
    }

    /**
     * Xóa cache entitlements của workspace (gọi từ observer khi purchase thay đổi).
     */
    public function forgetCache(string $workspaceId): void
    {
        Cache::forget($this->cacheKey($workspaceId));
    }

    /**
     * Tổng hợp flags + quotas từ tất cả purchases active của workspace.
     * Cache 5 phút; invalidate qua WorkspacePurchaseObserver.
     *
     * @return array{flags: list<string>, quotas: array<string, int>}
     */
    private function resolveEntitlements(string $workspaceId): array
    {
        return Cache::remember($this->cacheKey($workspaceId), self::CACHE_TTL, function () use ($workspaceId) {
            $purchases = WorkspacePurchase::withoutGlobalScope('workspace')
                ->where('workspace_id', $workspaceId)
                ->where('status', 'active')
                ->with('item')
                ->get();

            if ($purchases->isEmpty()) {
                return self::FREE_DEFAULTS;
            }

            $flags = [];
            $quotas = [];

            foreach ($purchases as $purchase) {
                $item = $purchase->item;
                if (! $item) {
                    continue;
                }

                foreach ($item->getFlags() as $flag) {
                    if (! in_array($flag, $flags, true)) {
                        $flags[] = $flag;
                    }
                }

                // Quotas: lấy giá trị cao nhất từ nhiều gói (upgrade an toàn)
                foreach ($item->getQuotas() as $key => $value) {
                    $quotas[$key] = max($quotas[$key] ?? 0, (int) $value);
                }
            }

            return ['flags' => $flags, 'quotas' => $quotas];
        });
    }

    private function cacheKey(string $workspaceId): string
    {
        return "billing:entitlements:{$workspaceId}";
    }
}
