<?php

namespace App\Providers;

use App\Http\Middleware\EnsureEntitled;
use App\Models\WorkspacePurchase;
use App\Observers\WorkspacePurchaseObserver;
use App\Services\EntitlementService;
use App\Services\MeteringService;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

/**
 * Billing service provider — CORE, luôn on.
 *
 * MeteringService = class concrete, KHÔNG còn binding interface→impl.
 * PaymentManager singleton đã chuyển sang IntegrationServiceProvider
 * (manager sống cùng module driver — internal-first).
 */
class BillingServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(EntitlementService::class, fn () => new EntitlementService());

        $this->app->singleton(MeteringService::class, function ($app) {
            return new MeteringService($app->make(EntitlementService::class));
        });
    }

    public function boot(): void
    {
        // Observer: cache forget khi purchase thay đổi
        WorkspacePurchase::observe($this->app->make(WorkspacePurchaseObserver::class));

        // Middleware alias cho entitlement gate
        Route::aliasMiddleware('entitled', EnsureEntitled::class);

        // Auto-grant plan.free khi Workspace created (observe ở đây để không sửa tenancy module)
        $this->observeWorkspaceCreated();
    }

    /**
     * Auto-grant plan.free cho workspace mới (F5/F11).
     * Observe Workspace::created thay vì sửa tenancy module (cô lập N1).
     */
    private function observeWorkspaceCreated(): void
    {
        // Dùng event listener thay vì Observer class để tránh tạo file thừa
        \App\Models\Workspace::created(function ($workspace) {
            $this->grantFreePlan($workspace->id);
        });
    }

    /**
     * Tạo WorkspacePurchase cho plan.free khi signup.
     * Idempotent: skip nếu đã có.
     *
     * Dùng pgsql_privileged để bypass RLS WITH CHECK — observer chạy trong
     * context chưa có app.current_workspace set (signup flow chưa bind workspace).
     * Schema::hasTable guard trước để tránh PostgreSQL transaction abort khi
     * bảng chưa tồn tại (test env fresh).
     */
    private function grantFreePlan(string $workspaceId): void
    {
        // ponytail: Schema::hasTable guard — PostgreSQL abort transaction cả khi
        // có try/catch PHP nếu query fail. Check trước ở tầng schema.
        if (! \Illuminate\Support\Facades\Schema::hasTable('marketplace_items')
            || ! \Illuminate\Support\Facades\Schema::hasTable('workspace_purchases')) {
            return;
        }

        try {
            $db = \Illuminate\Support\Facades\DB::connection('pgsql_privileged');

            $freeItem = $db->table('marketplace_items')
                ->where('code', 'plan.free')
                ->where('is_active', true)
                ->first();

            if (! $freeItem) {
                return; // seeder chưa chạy
            }

            $exists = $db->table('workspace_purchases')
                ->where('workspace_id', $workspaceId)
                ->where('item_id', $freeItem->id)
                ->where('status', 'active')
                ->exists();

            if ($exists) {
                return;
            }

            $db->table('workspace_purchases')->insert([
                'id' => (string) \Illuminate\Support\Str::orderedUuid(),
                'workspace_id' => $workspaceId,
                'item_id' => $freeItem->id,
                'status' => 'active',
                'quantity' => 1,
                'lock_version' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable) {
            // ponytail: fail-safe — không làm sập signup nếu billing lỗi bất ngờ
        }
    }
}
