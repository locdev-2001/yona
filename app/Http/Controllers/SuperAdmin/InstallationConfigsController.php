<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Models\InstallationConfig;
use App\Support\SuperAdmin\Dashboard;
use App\Support\SuperAdmin\Dashboards\InstallationConfigDashboard;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

// Port từ refs/chatwoot/app/controllers/super_admin/installation_configs_controller.rb
// — chỉ thao tác trên cấu hình chưa khoá, và luôn ghi locked = false.
class InstallationConfigsController extends ResourceController
{
    protected function dashboard(): Dashboard
    {
        return app(InstallationConfigDashboard::class);
    }

    protected function assign(Model $record, Request $request): void
    {
        $payload = (array) $request->input('installation_config', []);

        $request->validate(['installation_config.name' => 'required|string']);

        $record->name = $payload['name'];
        $record->value = ($payload['value'] ?? '') === '' ? null : $payload['value'];
        $record->locked = false;
    }

    public function restartRequired(InstallationConfig $config): bool
    {
        return in_array($config->name, InstallationConfig::RESTART_REQUIRED_CONFIG_KEYS, true);
    }
}
