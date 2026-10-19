<?php

namespace App\Support\SuperAdmin;

use App\Support\SuperAdminArea;
use Illuminate\Database\Eloquent\Model;
use InvalidArgumentException;

// Danh bạ dashboard của console quản trị — nguồn duy nhất quyết định khu
// /admin có những tài nguyên nào và theo thứ tự nào (bản gốc lấy thứ tự
// này từ thứ tự khai báo resources trong config/routes.rb).
class DashboardRegistry
{
    /** @var array<string, class-string<Dashboard>> */
    private const DASHBOARDS = [
        'accounts' => Dashboards\AccountDashboard::class,
        'users' => Dashboards\UserDashboard::class,
        'access_tokens' => Dashboards\AccessTokenDashboard::class,
        'installation_configs' => Dashboards\InstallationConfigDashboard::class,
        'agent_bots' => Dashboards\AgentBotDashboard::class,
        'platform_apps' => Dashboards\PlatformAppDashboard::class,
        'account_users' => Dashboards\AccountUserDashboard::class,
        'impersonations' => Dashboards\SuperAdminImpersonationDashboard::class,
        'abuse_reports' => Dashboards\AbuseReportDashboard::class,
    ];

    // Thứ tự mục trong thanh điều hướng (bản gốc bỏ các resource phụ trợ).
    private const NAVIGATION_RESOURCES = ['accounts', 'users', 'agent_bots', 'platform_apps', 'impersonations', 'abuse_reports'];

    /** @var array<string, Dashboard> */
    private array $resolved = [];

    public function get(string $resourceName): Dashboard
    {
        if (! isset(self::DASHBOARDS[$resourceName])) {
            throw new InvalidArgumentException("Unknown super admin resource [{$resourceName}]");
        }

        return $this->resolved[$resourceName] ??= app(self::DASHBOARDS[$resourceName]);
    }

    public function forModel(Model $record): ?Dashboard
    {
        foreach (array_keys(self::DASHBOARDS) as $resourceName) {
            $dashboard = $this->get($resourceName);

            if (is_a($record, $dashboard->modelClass())) {
                return $dashboard;
            }
        }

        return null;
    }

    /** @return list<array{resource: string, label: string, url: string}> */
    public function navigationItems(): array
    {
        return array_map(fn (string $resourceName) => [
            'resource' => $resourceName,
            'label' => $this->get($resourceName)->displayName(),
            'url' => SuperAdminArea::url($resourceName),
        ], self::NAVIGATION_RESOURCES);
    }
}
