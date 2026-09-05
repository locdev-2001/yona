import { useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';

import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import {
    ICON_BLOCKS,
    ICON_BRIEFCASE,
    ICON_BOT,
    ICON_CHART,
    ICON_CLOCK_ALERT,
    ICON_CODE,
    ICON_CONTACT,
    ICON_INBOX,
    ICON_LAYOUT_TEMPLATE,
    ICON_LIBRARY,
    ICON_MEGAPHONE,
    ICON_MESSAGE_CIRCLE,
    ICON_MESSAGE_QUOTE,
    ICON_REPEAT,
    ICON_SMILE,
    ICON_SQUARE_USER,
    ICON_TAGS,
    ICON_TOY_BRICK,
    ICON_USERS,
    ICON_USER_PEN,
} from 'dashboard/helper/commandbar/icons';
import type { CommandBarAction } from 'dashboard/helper/commandbar/actions';
import { t } from '../../i18n';
import type { DashboardPageProps } from '../types';
import { clearCommandBarActions, setCommandBarActions } from './commandBarStore';

// Port từ composables/commands/useGoToCommandHotKeys.js. Router Vue → Inertia:
// `routeName` của gốc thay bằng đường dẫn account-scoped (cùng đường dẫn sidebar
// đang dùng), `checkPermissions(meta.permissions)` thay bằng cờ `adminOnly`.
// Danh sách khớp ĐÚNG những gì oracle hiện ra (đã dò bằng `b10-cmdbar-probe.mjs`):
// Captain / Calls / SLA settings / Data / Audit Logs / Billing bị cờ tính năng của
// oracle chặn nên cũng không có ở đây; SLA *reports* thì oracle CÓ nên giữ lại.

const SECTION_GENERAL = 'COMMAND_BAR.SECTIONS.GENERAL';
const SECTION_REPORTS = 'COMMAND_BAR.SECTIONS.REPORTS';
const SECTION_SETTINGS = 'COMMAND_BAR.SECTIONS.SETTINGS';

const SOURCE = 'goto';

interface GoToCommand {
    id: string;
    title: string;
    section: string;
    icon: string;
    path: string;
    adminOnly?: boolean;
}

export const GO_TO_COMMANDS: GoToCommand[] = [
    {
        id: 'goto_my_inbox',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_MY_INBOX',
        section: SECTION_GENERAL,
        icon: ICON_INBOX,
        path: 'inbox-view',
    },
    {
        id: 'goto_conversation_dashboard',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_CONVERSATION_DASHBOARD',
        section: SECTION_GENERAL,
        icon: ICON_MESSAGE_CIRCLE,
        path: 'dashboard',
    },
    {
        id: 'goto_contacts_dashboard',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_CONTACTS_DASHBOARD',
        section: SECTION_GENERAL,
        icon: ICON_CONTACT,
        path: 'contacts',
    },
    {
        id: 'goto_campaigns',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_CAMPAIGNS',
        section: SECTION_GENERAL,
        icon: ICON_MEGAPHONE,
        path: 'campaigns/live_chat',
        adminOnly: true,
    },
    {
        id: 'goto_help_center',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_HELP_CENTER',
        section: SECTION_GENERAL,
        icon: ICON_LIBRARY,
        path: 'portals',
    },
    {
        id: 'open_reports_overview',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_REPORTS_OVERVIEW',
        section: SECTION_REPORTS,
        icon: ICON_CHART,
        path: 'reports/overview',
        adminOnly: true,
    },
    {
        id: 'open_conversation_reports',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_CONVERSATION_REPORTS',
        section: SECTION_REPORTS,
        icon: ICON_MESSAGE_CIRCLE,
        path: 'reports/conversation',
        adminOnly: true,
    },
    {
        id: 'open_agent_reports',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_AGENT_REPORTS',
        section: SECTION_REPORTS,
        icon: ICON_SQUARE_USER,
        path: 'reports/agent',
        adminOnly: true,
    },
    {
        id: 'open_label_reports',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_LABEL_REPORTS',
        section: SECTION_REPORTS,
        icon: ICON_TAGS,
        path: 'reports/label',
        adminOnly: true,
    },
    {
        id: 'open_inbox_reports',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_INBOX_REPORTS',
        section: SECTION_REPORTS,
        icon: ICON_INBOX,
        path: 'reports/inboxes',
        adminOnly: true,
    },
    {
        id: 'open_team_reports',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_TEAM_REPORTS',
        section: SECTION_REPORTS,
        icon: ICON_USERS,
        path: 'reports/teams',
        adminOnly: true,
    },
    {
        id: 'open_csat_reports',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_CSAT_REPORTS',
        section: SECTION_REPORTS,
        icon: ICON_SMILE,
        path: 'reports/csat',
        adminOnly: true,
    },
    {
        id: 'open_bot_reports',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_BOT_REPORTS',
        section: SECTION_REPORTS,
        icon: ICON_BOT,
        path: 'reports/bot',
        adminOnly: true,
    },
    {
        id: 'open_sla_reports',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_SLA_REPORTS',
        section: SECTION_REPORTS,
        icon: ICON_CLOCK_ALERT,
        path: 'reports/sla',
        adminOnly: true,
    },
    {
        id: 'open_agent_settings',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_SETTINGS_AGENTS',
        section: SECTION_SETTINGS,
        icon: ICON_SQUARE_USER,
        path: 'settings/agents/list',
        adminOnly: true,
    },
    {
        id: 'open_team_settings',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_SETTINGS_TEAMS',
        section: SECTION_SETTINGS,
        icon: ICON_USERS,
        path: 'settings/teams/list',
        adminOnly: true,
    },
    {
        id: 'open_inbox_settings',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_SETTINGS_INBOXES',
        section: SECTION_SETTINGS,
        icon: ICON_INBOX,
        path: 'settings/inboxes/list',
        adminOnly: true,
    },
    {
        id: 'open_template_settings',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_SETTINGS_TEMPLATES',
        section: SECTION_SETTINGS,
        icon: ICON_LAYOUT_TEMPLATE,
        path: 'settings/templates',
        adminOnly: true,
    },
    {
        id: 'open_label_settings',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_SETTINGS_LABELS',
        section: SECTION_SETTINGS,
        icon: ICON_TAGS,
        path: 'settings/labels/list',
        adminOnly: true,
    },
    {
        id: 'open_custom_attribute_settings',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_SETTINGS_CUSTOM_ATTRIBUTES',
        section: SECTION_SETTINGS,
        icon: ICON_CODE,
        path: 'settings/custom-attributes/list',
        adminOnly: true,
    },
    {
        id: 'open_automation_settings',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_SETTINGS_AUTOMATION',
        section: SECTION_SETTINGS,
        icon: ICON_REPEAT,
        path: 'settings/automation/list',
        adminOnly: true,
    },
    {
        id: 'open_macro_settings',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_SETTINGS_MACROS',
        section: SECTION_SETTINGS,
        icon: ICON_TOY_BRICK,
        path: 'settings/macros',
    },
    {
        id: 'open_canned_response_settings',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_SETTINGS_CANNED_RESPONSES',
        section: SECTION_SETTINGS,
        icon: ICON_MESSAGE_QUOTE,
        path: 'settings/canned-response/list',
    },
    {
        id: 'open_applications_settings',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_SETTINGS_APPLICATIONS',
        section: SECTION_SETTINGS,
        icon: ICON_BLOCKS,
        path: 'settings/integrations',
        adminOnly: true,
    },
    {
        id: 'open_account_settings',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_SETTINGS_ACCOUNT',
        section: SECTION_SETTINGS,
        icon: ICON_BRIEFCASE,
        path: 'settings/general',
        adminOnly: true,
    },
    {
        id: 'open_profile_settings',
        title: 'COMMAND_BAR.COMMANDS.GO_TO_SETTINGS_PROFILE',
        section: SECTION_SETTINGS,
        icon: ICON_USER_PEN,
        path: 'profile/settings',
    },
];

// Hàm thuần để test: lọc theo vai trò rồi dịch title/section.
export function buildGoToActions(accountId: number, isAdministrator: boolean): CommandBarAction[] {
    return GO_TO_COMMANDS.filter(command => !command.adminOnly || isAdministrator).map(command => {
        const url = accountScopedUrl(accountId, command.path);
        return {
            id: command.id,
            title: t(command.title),
            section: t(command.section),
            icon: command.icon,
            handler: () => router.visit(url),
        };
    });
}

export function useGoToCommandHotKeys(): void {
    const { currentAccount, currentAccountUser } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount?.id ?? 0;
    const isAdministrator = currentAccountUser?.role === 'administrator';

    useEffect(() => {
        if (!accountId) return undefined;

        setCommandBarActions(SOURCE, buildGoToActions(accountId, isAdministrator));
        return () => clearCommandBarActions(SOURCE);
    }, [accountId, isAdministrator]);
}
