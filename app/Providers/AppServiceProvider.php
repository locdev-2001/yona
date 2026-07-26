<?php

namespace App\Providers;

use App\Models\EmailTemplate;
use App\Models\User;
use App\Policies\EmailTemplatePolicy;
use App\Support\DbRoleGuard;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Opcodes\LogViewer\Facades\LogViewer;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Chat và Payment là hai chức năng của sản phẩm, khai báo thẳng ở
        // bootstrap/providers.php. Không còn cổng class_exists nào ở đây: cổng đó
        // trả false khi FQCN đổi mà quên sửa, rồi bỏ qua provider trong im lặng —
        // hỏng kiểu đó không có lỗi, chỉ có tin nhắn không gửi được.
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Defense-in-depth: block destructive DB commands (migrate:fresh / migrate:refresh
        // / migrate:reset / db:wipe) everywhere EXCEPT the test suite, which legitimately
        // rebuilds its own throwaway DB. A careless `migrate:fresh --seed` against the dev
        // DB once wiped local data. To run one intentionally, set DB_ALLOW_DESTRUCTIVE=true.
        if (! $this->app->runningUnitTests()) {
            DB::prohibitDestructiveCommands(! config('database.allow_destructive'));
        }

        // P10 boot-guard: production KHÔNG BAO GIỜ chạy bằng role superuser —
        // superuser bypass RLS toàn cluster = tenant isolation chết im lặng.
        // Runbook siết role: docs/database-safety.md (ALTER ROLE ... NOSUPERUSER BYPASSRLS).
        if ($this->app->environment('production')) {
            $violations = DbRoleGuard::superuserViolations();
            if ($violations !== []) {
                logger()->critical('DB role guard: runtime đang là SUPERUSER — từ chối boot', ['connections' => $violations]);
                throw new \RuntimeException('DB role misconfigured: superuser runtime on ['.implode(', ', $violations).']. See docs/database-safety.md.');
            }
        }

        // Workspace admin/owner has unrestricted access WITHIN their workspace.
        // Cross-workspace isolation is still enforced by Postgres RLS + the
        // BelongsToWorkspace scope, so this only removes per-feature permission
        // gating: a workspace admin automatically gains any NEW permission with
        // zero re-seeding. Returns null (falls through to normal policy/permission
        // checks) for every non-admin member.
        Gate::before(function ($user, string $ability): ?bool {
            if ($user instanceof User && currentMembership()?->role === 'admin') {
                return true;
            }

            return null;
        });

        // P06 — EmailTemplatePolicy registered here as backup (EmailServiceProvider is primary).
        // crm-sales policies + events registered in CrmSalesServiceProvider.
        // Project + Task policies registered in ProjectsServiceProvider.
        Gate::policy(EmailTemplate::class, EmailTemplatePolicy::class);

        // Log chứa dữ liệu nhạy cảm — chỉ mở ở local; môi trường khác cần gate thật (admin RBAC) trước khi bật.
        LogViewer::auth(fn () => app()->environment('local'));
    }
}
