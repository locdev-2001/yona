import { t } from '../../../i18n';
import { COMPACT_INTERFACE } from 'shared/helpers/productVisibility';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import type { SidebarMenuItem } from './provider';
import { EMPTY_UNREAD_COUNTS } from './useConversationUnreadCounts';
import type { SidebarUnreadCounts } from './useConversationUnreadCounts';
import type { ChannelPlatform } from 'shared/constants/channelPlatform';

// Inbox rút gọn share từ SetCurrentAccount.
export interface SidebarInbox {
    id: number;
    name: string;
    channel_type: string;
    // Kênh mất phiên xác thực (Zalo mất phiên, Facebook/Instagram bị Meta thu hồi quyền, …).
    reauthorization_required?: boolean;
    platform?: ChannelPlatform | null;
}

// Team của user (teams/getMyTeams) cho nhóm Teams.
export interface SidebarTeam {
    id: number;
    name: string;
}

// Nhãn bật `show_on_sidebar` (labels/getLabelsOnSidebar).
export interface SidebarLabel {
    id: number;
    title: string;
    color: string;
}

// Port từ menuItems computed trong sidebar/Sidebar.vue.
// Ẩn theo quyết định skip EE: Captain, Calls, Companies, Audit Logs,
// Custom Roles, SLA, Billing, Agent Assignment.
// Conversation Workflow HIỆN từ D6: `auto_resolve_conversations` là tính năng
// OSS và bật mặc định trong config/features.php, không phải EE như A3 giả định.
// Folders (custom view hội thoại) và Segments (custom view liên hệ) đọc store
// composables/useCustomViews (E1); nhóm "Tagged With" vẫn rỗng (route liên hệ
// theo nhãn chưa port).
// Kênh và nhãn không còn là mục điều hướng: lọc theo chúng nằm ở bảng Lọc của danh
// sách hội thoại. Badge của Hộp thư là tổng số trên chuông chia theo kênh
// (Sidebar.tsx ghép vào `inboxes`), luôn bật. Trung tâm thông báo không còn là mục
// menu: mở từ chuông ở hàng đầu sidebar (NotificationBell).
// Custom view rút gọn cho hai nhóm Folders/Segments.
export interface SidebarCustomView {
    id: number;
    name: string;
}

export function buildMenuItems(
    accountId: number,
    _inboxes: SidebarInbox[] = [],
    teams: SidebarTeam[] = [],
    _labels: SidebarLabel[] = [],
    unreadCounts: SidebarUnreadCounts = EMPTY_UNREAD_COUNTS,
    conversationCustomViews: SidebarCustomView[] = [],
    contactCustomViews: SidebarCustomView[] = [],
): SidebarMenuItem[] {
    const scoped = (path: string) => accountScopedUrl(accountId, path);
    const inboxUnreadTotal = Object.values(unreadCounts.inboxes).reduce((total, count) => total + count, 0);

    return [
        {
            name: 'Conversation',
            label: t(COMPACT_INTERFACE ? 'SIDEBAR.COMPACT_INBOX' : 'SIDEBAR.CONVERSATIONS'),
            icon: 'i-lucide-message-circle',
            badgeCount: inboxUnreadTotal,
            children: [
                {
                    name: 'All',
                    label: t('SIDEBAR.ALL_CONVERSATIONS'),
                    icon: 'i-lucide-inbox',
                    badgeCount: unreadCounts.allCount,
                    activeOn: [scoped('conversations')],
                    to: scoped('dashboard'),
                },
                {
                    name: 'Mentions',
                    label: t('SIDEBAR.MENTIONED_CONVERSATIONS'),
                    icon: 'i-lucide-at-sign',
                    // badgeCount của gốc gắn với cờ `filtered_conversation_unread_counts`
                    // (FilteredCounter) — cờ tắt ở cả hai bên nên không có badge.
                    activeOn: [scoped('mentions/conversations')],
                    to: scoped('mentions/conversations'),
                },
                {
                    name: 'Participating',
                    productFeature: 'conversationViews',
                    label: t('SIDEBAR.PARTICIPATING_CONVERSATIONS'),
                    icon: 'i-lucide-user-round-check',
                    to: scoped('participating/conversations'),
                },
                {
                    name: 'Unattended',
                    productFeature: 'conversationViews',
                    label: t('SIDEBAR.UNATTENDED_CONVERSATIONS'),
                    icon: 'i-lucide-clock-alert',
                    to: scoped('unattended/conversations'),
                },
                {
                    name: 'Folders',
                    productFeature: 'conversationViews',
                    label: t('SIDEBAR.CUSTOM_VIEWS_FOLDER'),
                    icon: 'i-lucide-folder',
                    activeOn: [scoped('custom_view')],
                    collapsible: true,
                    showTreeLine: true,
                    children: conversationCustomViews.map(view => ({
                        name: `${view.name}-${view.id}`,
                        label: view.name,
                        to: scoped(`custom_view/${view.id}`),
                    })),
                },
                {
                    name: 'Teams',
                    productFeature: 'teams',
                    label: t('SIDEBAR.TEAMS'),
                    icon: 'i-lucide-users',
                    collapsible: true,
                    showTreeLine: true,
                    children: teams.map(team => ({
                        name: `${team.name}-${team.id}`,
                        label: team.name,
                        badgeCount: unreadCounts.teams[String(team.id)] ?? 0,
                        to: scoped(`team/${team.id}`),
                    })),
                },
            ],
        },
        {
            name: 'Contacts',
            label: t(COMPACT_INTERFACE ? 'SIDEBAR.COMPACT_CONTACTS' : 'SIDEBAR.CONTACTS'),
            collapseSingleChild: true,
            activeOn: [scoped('contacts')],
            icon: 'i-lucide-contact',
            children: [
                {
                    name: 'All Contacts',
                    label: t('SIDEBAR.ALL_CONTACTS'),
                    to: scoped('contacts'),
                },
                {
                    name: 'Active',
                    productFeature: 'contactViews',
                    label: t('SIDEBAR.ACTIVE'),
                    to: scoped('contacts/active'),
                },
                {
                    name: 'Segments',
                    productFeature: 'contactViews',
                    icon: 'i-lucide-group',
                    label: t('SIDEBAR.CUSTOM_VIEWS_SEGMENTS'),
                    activeOn: [scoped('contacts/segments')],
                    collapsible: true,
                    showTreeLine: true,
                    children: contactCustomViews.map(view => ({
                        name: `${view.name}-${view.id}`,
                        label: view.name,
                        to: scoped(`contacts/segments/${view.id}`),
                    })),
                },
                {
                    name: 'Tagged With',
                    productFeature: 'contactViews',
                    icon: 'i-lucide-tag',
                    label: t('SIDEBAR.TAGGED_WITH'),
                    collapsible: true,
                    showTreeLine: true,
                    // Route liên hệ theo nhãn chưa port (nhóm sau) — giữ rỗng.
                    children: [],
                },
            ],
        },
        // reports.routes.js meta.permissions ['administrator', 'report_manage'] —
        // report_manage là custom role (EE) nên chỉ administrator; agent ẩn cả nhóm.
        {
            name: 'Reports',
            collapseSingleChild: true,
            activeOn: [scoped('reports')],
            permissions: ['administrator'],
            label: t('SIDEBAR.REPORTS'),
            icon: 'i-lucide-chart-spline',
            children: [
                { name: 'Report Overview', label: t('SIDEBAR.REPORTS_OVERVIEW'), to: scoped('reports/overview') },
                { name: 'Report Conversation', productFeature: 'detailedReports', label: t('SIDEBAR.REPORTS_CONVERSATION'), to: scoped('reports/conversation') },
                { name: 'Reports Agent', productFeature: 'detailedReports', label: t('SIDEBAR.REPORTS_AGENT'), to: scoped('reports/agent') },
                { name: 'Reports Label', productFeature: 'detailedReports', label: t('SIDEBAR.REPORTS_LABEL'), to: scoped('reports/label') },
                { name: 'Reports Inbox', productFeature: 'detailedReports', label: t('SIDEBAR.REPORTS_INBOX'), to: scoped('reports/inboxes') },
                { name: 'Reports Team', productFeature: 'detailedReports', label: t('SIDEBAR.REPORTS_TEAM'), to: scoped('reports/teams') },
                { name: 'Reports CSAT', productFeature: 'csat', label: t('SIDEBAR.CSAT'), to: scoped('reports/csat') },
                { name: 'Reports Bot', productFeature: 'agentBots', label: t('SIDEBAR.REPORTS_BOT'), to: scoped('reports/bot') },
            ],
        },
        // campaigns.routes.js meta.permissions ['administrator'].
        {
            name: 'Campaigns',
            productFeature: 'campaigns',
            permissions: ['administrator'],
            label: t('SIDEBAR.CAMPAIGNS'),
            icon: 'i-lucide-megaphone',
            children: [
                { name: 'Live chat', label: t('SIDEBAR.LIVE_CHAT'), to: scoped('campaigns/live_chat') },
                { name: 'SMS', label: t('SIDEBAR.SMS'), to: scoped('campaigns/sms') },
                // campaigns.routes.js: nhánh WhatsApp gắn FEATURE_FLAGS.WHATSAPP_CAMPAIGNS.
                {
                    name: 'WhatsApp',
                    label: t('SIDEBAR.WHATSAPP'),
                    to: scoped('campaigns/whatsapp'),
                    featureFlag: 'whatsapp_campaign',
                },
            ],
        },
        {
            name: 'Portals',
            productFeature: 'helpCenter',
            label: t('SIDEBAR.HELP_CENTER.TITLE'),
            icon: 'i-lucide-library-big',
            children: [
                { name: 'Articles', label: t('SIDEBAR.HELP_CENTER.ARTICLES'), to: scoped('portals/portals_articles_index') },
                { name: 'Categories', label: t('SIDEBAR.HELP_CENTER.CATEGORIES'), to: scoped('portals/portals_categories_index') },
                { name: 'Locales', label: t('SIDEBAR.HELP_CENTER.LOCALES'), to: scoped('portals/portals_locales_index') },
                { name: 'Settings', label: t('SIDEBAR.HELP_CENTER.SETTINGS'), to: scoped('portals/portals_settings_index') },
            ],
        },
        {
            name: 'Settings',
            label: t('SIDEBAR.SETTINGS'),
            icon: 'i-lucide-bolt',
            children: [
                {
                    name: 'Settings Agents',
                    permissions: ['administrator'],
                    label: t('SIDEBAR.AGENTS'),
                    icon: 'i-lucide-square-user',
                    to: scoped('settings/agents/list'),
                },
                {
                    name: 'Settings Teams',
                    productFeature: 'teams',
                    permissions: ['administrator'],
                    label: t('SIDEBAR.TEAMS'),
                    icon: 'i-lucide-users',
                    activeOn: [scoped('settings/teams')],
                    to: scoped('settings/teams/list'),
                },
                {
                    name: 'Settings Inboxes',
                    permissions: ['administrator'],
                    label: t('SIDEBAR.INBOXES'),
                    icon: 'i-lucide-inbox',
                    activeOn: [scoped('settings/inboxes')],
                    to: scoped('settings/inboxes/list'),
                },
                {
                    name: 'Settings Templates',
                    productFeature: 'whatsappTemplates',
                    permissions: ['administrator'],
                    label: t('SIDEBAR.WHATSAPP_TEMPLATES'),
                    icon: 'i-lucide-layout-template',
                    to: scoped('settings/templates'),
                },
                {
                    name: 'Settings Labels',
                    permissions: ['administrator'],
                    label: t('SIDEBAR.LABELS'),
                    icon: 'i-lucide-tags',
                    to: scoped('settings/labels/list'),
                },
                {
                    name: 'Settings Widget Updates',
                    productFeature: 'widgetUpdates',
                    permissions: ['administrator'],
                    label: t('SIDEBAR.WIDGET_UPDATES'),
                    icon: 'i-lucide-newspaper',
                    to: scoped('settings/widget-updates'),
                },
                {
                    name: 'Settings Payment Accounts',
                    permissions: ['administrator'],
                    label: t('SIDEBAR.PAYMENT_ACCOUNTS'),
                    icon: 'i-lucide-landmark',
                    to: scoped('settings/payment-accounts'),
                },
                {
                    name: 'Settings Custom Stickers',
                    label: t('STICKER_LIBRARY.MENU'),
                    icon: 'i-lucide-sticker',
                    to: scoped('settings/custom-stickers'),
                },
                {
                    name: 'Settings Custom Attributes',
                    productFeature: 'customAttributes',
                    permissions: ['administrator'],
                    label: t('SIDEBAR.CUSTOM_ATTRIBUTES'),
                    icon: 'i-lucide-code',
                    to: scoped('settings/custom-attributes/list'),
                },
                {
                    name: 'Settings Automation',
                    productFeature: 'automations',
                    permissions: ['administrator'],
                    label: t('SIDEBAR.AUTOMATION'),
                    icon: 'i-lucide-repeat',
                    to: scoped('settings/automation/list'),
                },
                {
                    name: 'Settings Agent Bots',
                    productFeature: 'agentBots',
                    permissions: ['administrator'],
                    label: t('SIDEBAR.AGENT_BOTS'),
                    icon: 'i-lucide-bot',
                    to: scoped('settings/agent-bots'),
                },
                {
                    name: 'Settings Macros',
                    productFeature: 'macros',
                    label: t('SIDEBAR.MACROS'),
                    icon: 'i-lucide-toy-brick',
                    to: scoped('settings/macros'),
                },
                {
                    name: 'Settings Canned Responses',
                    label: t('SIDEBAR.CANNED_RESPONSES'),
                    icon: 'i-lucide-message-square-quote',
                    to: scoped('settings/canned-response/list'),
                },
                {
                    name: 'Settings Integrations',
                    productFeature: 'integrations',
                    permissions: ['administrator'],
                    label: t('SIDEBAR.INTEGRATIONS'),
                    icon: 'i-lucide-blocks',
                    to: scoped('settings/integrations'),
                },
                {
                    name: 'Settings Data',
                    productFeature: 'dataManagement',
                    permissions: ['administrator'],
                    label: t('SIDEBAR.DATA'),
                    icon: 'i-lucide-database',
                    to: scoped('settings/data/imports'),
                },
                {
                    name: 'Conversation Workflow',
                    productFeature: 'conversationWorkflow',
                    permissions: ['administrator'],
                    label: t('SIDEBAR.CONVERSATION_WORKFLOW'),
                    icon: 'i-lucide-workflow',
                    to: scoped('settings/conversation-workflow'),
                },
                {
                    name: 'Settings Security',
                    productFeature: 'workspaceSecurity',
                    permissions: ['administrator'],
                    label: t('SIDEBAR.SECURITY'),
                    icon: 'i-lucide-shield',
                    to: scoped('settings/security'),
                },
            ],
        },
    ];
}
