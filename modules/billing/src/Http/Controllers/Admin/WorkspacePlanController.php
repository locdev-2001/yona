<?php

namespace Modules\Billing\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Modules\Billing\Models\MarketplaceItem;
use Modules\Billing\Services\GrantPlanService;
use Modules\Tenancy\Models\Workspace;

/**
 * Admin: cấp/thu hồi gói cho workspace thủ công.
 *
 * Gọi GrantPlanService — single source of truth cho grant/revoke.
 * Dùng pgsql_privileged cho queries read (bypass RLS — admin không bind workspace).
 */
class WorkspacePlanController extends Controller
{
    public function __construct(private readonly GrantPlanService $grantPlanService) {}

    public function index(Workspace $workspace): Response
    {
        $db = DB::connection('pgsql_privileged');

        $items = MarketplaceItem::where('is_active', true)
            ->orderBy('type')
            ->orderBy('price_cents')
            ->get(['id', 'code', 'name', 'type', 'billing_type', 'price_cents', 'currency', 'entitlements']);

        $activePurchases = $db->table('workspace_purchases')
            ->where('workspace_id', $workspace->id)
            ->where('status', 'active')
            ->pluck('item_id')
            ->toArray();

        $channelUsage = $db->table('channel_usage')
            ->where('workspace_id', $workspace->id)
            ->where('period', now('Asia/Ho_Chi_Minh')->format('Y-m'))
            ->get(['channel', 'answered_count'])
            ->keyBy(fn (object $row) => $row->channel)
            ->map(fn (object $row) => (int) $row->answered_count);

        return Inertia::render('Modules.Billing.admin/workspace-plans/index', [
            'workspace' => [
                'id' => $workspace->id,
                'name' => $workspace->name,
                'slug' => $workspace->slug,
            ],
            'items' => $items->map(fn (MarketplaceItem $item) => [
                'id' => $item->id,
                'code' => $item->code,
                'name' => $item->name,
                'type' => $item->type,
                'billing_type' => $item->billing_type,
                'price_cents' => $item->price_cents,
                'currency' => $item->currency,
                'flags' => $item->getFlags(),
                'quotas' => $item->getQuotas(),
                'active' => in_array($item->id, $activePurchases, true),
            ]),
            'channel_usage' => $channelUsage,
        ]);
    }

    public function store(Request $request, Workspace $workspace): RedirectResponse
    {
        $validated = $request->validate([
            'item_code' => ['required', 'string', 'exists:marketplace_items,code'],
        ]);

        $this->grantPlanService->grant($workspace->id, $validated['item_code']);

        return back()->with('success', "Đã cấp gói {$validated['item_code']} cho workspace {$workspace->name}.");
    }

    public function destroy(Request $request, Workspace $workspace): RedirectResponse
    {
        $validated = $request->validate([
            'item_code' => ['required', 'string'],
        ]);

        $this->grantPlanService->revoke($workspace->id, $validated['item_code']);

        return back()->with('success', "Đã thu hồi gói {$validated['item_code']} khỏi workspace {$workspace->name}.");
    }
}
