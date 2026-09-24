<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Support\SuperAdmin\Dashboard;
use App\Support\SuperAdmin\Dashboards\AgentBotDashboard;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

// Port từ refs/chatwoot/app/controllers/super_admin/agent_bots_controller.rb.
class AgentBotsController extends ResourceController
{
    protected function dashboard(): Dashboard
    {
        return app(AgentBotDashboard::class);
    }

    protected function assign(Model $record, Request $request): void
    {
        $payload = (array) $request->input('agent_bot', []);

        $record->fill([
            'name' => $payload['name'] ?? $record->name,
            'description' => $payload['description'] ?? $record->description,
            'outgoing_url' => $payload['outgoing_url'] ?? $record->outgoing_url,
            'account_id' => $payload['account'] ?? $record->account_id,
        ]);
    }

    public function destroyAvatar(int $id): RedirectResponse
    {
        $this->findRecord($id)->removeAvatar();

        return back();
    }
}
