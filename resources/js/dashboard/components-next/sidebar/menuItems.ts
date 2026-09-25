import { createElement } from 'react';

import { t } from '../../../i18n';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import { SidebarChannelLeafContent } from './SidebarGroupLeaf';
import type { SidebarMenuItem } from './provider';
import { EMPTY_UNREAD_COUNTS } from './useConversationUnreadCounts';
import type { SidebarUnreadCounts } from './useConversationUnreadCounts';
import type { ChannelPlatform } from 'shared/constants/channelPlatform';

// Inbox rút gọn share từ SetCurrentAccount cho nhóm Channels.
export interface SidebarInbox {
    id: number;
    name: string;
    channel_type: string;
    // Kênh mất phiên xác thực (Zalo mất phiên, Facebook/Instagram bị Meta thu hồi
    // quyền, …) — cảnh báo icon cạnh mục Channels như bản gốc ChannelLeaf.vue.
    reauthorization_required?: boolean;
    platform?: ChannelPlatform | null;
}

// Team của user (teams/getMyTeams) cho nhóm Teams.
export interface SidebarTeam {
    id: number;
    name: string;
}

// Nhãn bật `show_on_sidebar` (labels/getLabelsOnSidebar) cho nhóm Labels.
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
// badgeCount lấy từ store conversationUnreadCounts (B8) — rỗng khi account chưa
// bật cờ `conversation_unread_counts`, đúng như oracle. Trung tâm thông báo không
// còn là mục menu: mở từ chuông ở hàng đầu sidebar (NotificationBell).
// Custom view rút gọn cho hai nhóm Folders/Segments.
export interface SidebarCustomView {
    id: number;
    name: string;
}

export function buildMenuItems(
    accountId: number,
    inboxes: SidebarInbox[] = [],
    teams: SidebarTeam[] = [],
    labels: SidebarLabel[] = [],
    unreadCounts: SidebarUnreadCounts = EMPTY_UNREAD_COUNTS,
    conversationCustomViews: SidebarCustomView[] = [],
    contactCustomViews: SidebarCustomView[] = [],
): SidebarMenuItem[] {
    const scoped = (path: string) => accountScopedUrl(accountId, path);

    return [
        {
            name: 'Conversation',
            label: t('SIDEBAR.CONVERSATIONS'),
            icon: 'i-lucide-message-circle',
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
                    label: t('SIDEBAR.PARTICIPATING_CONVERSATIONS'),
                    icon: 'i-lucide-user-round-check',
                    to: scoped('participating/conversations'),
                },
                {
                    name: 'Unattended',
                    label: t('SIDEBAR.UNATTENDED_CONVERSATIONS'),
                    icon: 'i-lucide-clock-alert',
                    to: scoped('unattended/conversations'),
                },
                {
                    name: 'Folders',
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
                {
                    name: 'Channels',
                    label: t('SIDEBAR.CHANNELS'),
                    icon: 'i-lucide-mailbox',
                    collapsible: true,
                    showTreeLine: true,
                    children: inboxes.map(inbox => ({
                        name: `${inbox.name}-${inbox.id}`,
                        label: inbox.name,
                        badgeCount: unreadCounts.inboxes[String(inbox.id)] ?? 0,
                        to: scoped(`inbox/${inbox.id}`),
                        component: ({ label, badgeCount }: { label: string; active: boolean; badgeCount?: number }) =>
                            createElement(SidebarChannelLeafContent, { label, badgeCount, inbox }),
                    })),
                },
                {
                    name: 'Labels',
                    label: t('SIDEBAR.LABELS'),
                    icon: 'i-lucide-tag',
                    activeOn: [scoped('label')],
                    collapsible: true,
                    showTreeLine: true,
                    children: labels.map(label => ({
                        name: `${label.title}-${label.id}`,
                        label: label.title,
                        icon: createElement('span', {
                            className: 'size-[8px] rounded-sm',
                            style: { backgroundColor: label.color },
                        }),
                        badgeCount: unreadCounts.labels[String(label.id)] ?? 0,
                        to: scoped(`label/${encodeURIComponent(label.title)}`),
                    })),
                },
            ],
        },
        {
            name: 'Contacts',
            label: t('SIDEBAR.CONTACTS'),
            icon: 'i-lucide-contact',
            children: [
                {
                    name: 'All Contacts',
                    label: t('SIDEBAR.ALL_CONTACTS'),
                    to: scoped('contacts'),
                },
                {
                    name: 'Active',
                    label: t('SIDEBAR.ACTIVE'),
                    to: scoped('contacts/active'),
                },
                {
                    name: 'Segments',
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
            permissions: ['administrator'],
            label: t('SIDEBAR.REPORTS'),
            icon: 'i-lucide-chart-spline',
            children: [
                { name: 'Report Overview', label: t('SIDEBAR.REPORTS_OVERVIEW'), to: scoped('reports/overview') },
                { name: 'Report Conversation', label: t('SIDEBAR.REPORTS_CONVERSATION'), to: scoped('reports/conversation') },
                { name: 'Reports Agent', label: t('SIDEBAR.REPORTS_AGENT'), to: scoped('reports/agent') },
                { name: 'Reports Label', label: t('SIDEBAR.REPORTS_LABEL'), to: scoped('reports/label') },
                { name: 'Reports Inbox', label: t('SIDEBAR.REPORTS_INBOX'), to: scoped('reports/inboxes') },
                { name: 'Reports Team', label: t('SIDEBAR.REPORTS_TEAM'), to: scoped('reports/teams') },
                { name: 'Reports CSAT', label: t('SIDEBAR.CSAT'), to: scoped('reports/csat') },
                { name: 'Reports Bot', label: t('SIDEBAR.REPORTS_BOT'), to: scoped('reports/bot') },
            ],
        },
        // campaigns.routes.js meta.permissions ['administrator'].
        {
            name: 'Campaigns',
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
                    name: 'Settings Account Settings',
                    permissions: ['administrator'],
                    label: t('SIDEBAR.ACCOUNT_SETTINGS'),
                    icon: 'i-lucide-briefcase',
                    to: scoped('settings/general'),
                },
                {
                    name: 'Settings Agents',
                    permissions: ['administrator'],
                    label: t('SIDEBAR.AGENTS'),
                    icon: 'i-lucide-square-user',
                    to: scoped('settings/agents/list'),
                },
                {
                    name: 'Settings Teams',
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
                    permissions: ['administrator'],
                    label: t('SIDEBAR.WIDGET_UPDATES'),
                    icon: 'i-lucide-newspaper',
                    to: scoped('settings/widget-updates'),
                },
                {
                    name: 'Settings Custom Attributes',
                    permissions: ['administrator'],
                    label: t('SIDEBAR.CUSTOM_ATTRIBUTES'),
                    icon: 'i-lucide-code',
                    to: scoped('settings/custom-attributes/list'),
                },
                {
                    name: 'Settings Automation',
                    permissions: ['administrator'],
                    label: t('SIDEBAR.AUTOMATION'),
                    icon: 'i-lucide-repeat',
                    to: scoped('settings/automation/list'),
                },
                {
                    name: 'Settings Agent Bots',
                    permissions: ['administrator'],
                    label: t('SIDEBAR.AGENT_BOTS'),
                    icon: 'i-lucide-bot',
                    to: scoped('settings/agent-bots'),
                },
                {
                    name: 'Settings Macros',
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
                    permissions: ['administrator'],
                    label: t('SIDEBAR.INTEGRATIONS'),
                    icon: 'i-lucide-blocks',
                    to: scoped('settings/integrations'),
                },
                {
                    name: 'Settings Data',
                    permissions: ['administrator'],
                    label: t('SIDEBAR.DATA'),
                    icon: 'i-lucide-database',
                    to: scoped('settings/data/imports'),
                },
                {
                    name: 'Conversation Workflow',
                    permissions: ['administrator'],
                    label: t('SIDEBAR.CONVERSATION_WORKFLOW'),
                    icon: 'i-lucide-workflow',
                    to: scoped('settings/conversation-workflow'),
                },
                {
                    name: 'Settings Security',
                    permissions: ['administrator'],
                    label: t('SIDEBAR.SECURITY'),
                    icon: 'i-lucide-shield',
                    to: scoped('settings/security'),
                },
            ],
        },
    ];
}
