// Port từ dashboard/helper/featureHelper.js (giữ nguyên bảng URL trợ giúp;
// các key EE — sla/saml/captain* — bỏ theo quyết định #12).
const FEATURE_HELP_URLS: Record<string, string> = {
    agent_bots: 'https://chwt.app/hc/agent-bots',
    agents: 'https://chwt.app/hc/agents',
    campaigns: 'https://chwt.app/hc/campaigns',
    canned_responses: 'https://chwt.app/hc/canned',
    channel_email: 'https://chwt.app/hc/email',
    channel_facebook: 'https://chwt.app/hc/fb',
    custom_attributes: 'https://chwt.app/hc/custom-attributes',
    dashboard_apps: 'https://chwt.app/hc/dashboard-apps',
    help_center: 'https://chwt.app/hc/help-center',
    inboxes: 'https://chwt.app/hc/inboxes',
    integrations: 'https://chwt.app/hc/integrations',
    labels: 'https://chwt.app/hc/labels',
    macros: 'https://chwt.app/hc/macros',
    reports: 'https://chwt.app/hc/reports',
    team_management: 'https://chwt.app/hc/teams',
    webhook: 'https://chwt.app/hc/webhooks',
    billing: 'https://chwt.app/pricing',
};

export function getHelpUrlForFeature(featureName: string): string | undefined {
    return FEATURE_HELP_URLS[featureName];
}
