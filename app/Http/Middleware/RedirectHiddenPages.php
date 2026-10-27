<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

// Yona là hộp thư cá nhân: các trang dành cho đội ngũ doanh nghiệp (nhân viên, team,
// báo cáo, chiến dịch, tự động hoá, trung tâm trợ giúp…) đã gỡ khỏi giao diện.
// Route và API vẫn còn; mở bằng URL trực tiếp thì đưa về hộp thư.
class RedirectHiddenPages
{
    private const HIDDEN_ROUTE_NAMES = [
        'settings_agents',
        'settings_teams_*',
        'team_conversations',
        'conversations_through_team',
        'conversation_mentions',
        'conversation_through_mentions',
        'folder_conversations',
        'conversations_through_folders',
        'contacts_dashboard_active',
        'contacts_dashboard_segments_index',
        'contacts_edit_segment',
        'contacts_dashboard_labels_index',
        'contacts_edit_label',
        '*_reports',
        '*_reports_index',
        '*_reports_show',
        'campaigns_*',
        'portals_*',
        'settings_widget_updates',
        'attributes_list',
        'agent_bots',
        'settings_applications',
        'settings_integrations_*',
        'settings_automation_list',
        'macros_*',
        'conversation_workflow_index',
        'account_view',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->routeIs(...self::HIDDEN_ROUTE_NAMES)) {
            $accountId = $request->attributes->get('currentAccountUser')?->account_id;

            return redirect("/app/accounts/{$accountId}/dashboard");
        }

        return $next($request);
    }
}
