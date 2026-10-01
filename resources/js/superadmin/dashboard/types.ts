export type WidgetSize = 'sm' | 'md' | 'lg' | 'full';

export type WidgetSource = 'server' | 'client';

export type WidgetMeta = {
    key: string;
    title: string;
    description: string;
    defaultSize: WidgetSize;
    source: WidgetSource;
};

export type LayoutItem = { key: string; size: WidgetSize };

export type RangePreset = string;

export type OperationLink = { key: string; url: string; external: boolean };

export type DashboardProps = {
    widgets: WidgetMeta[];
    layout: LayoutItem[];
    sizes: WidgetSize[];
    ranges: RangePreset[];
    defaultRange: RangePreset;
    endpoints: { widgets: string; layout: string };
    links: OperationLink[];
};

export type DateRangeInfo = { from: string; to: string; days: number };

export type WidgetResponse<T = unknown> = { key: string; range: DateRangeInfo; data: T };

export type KpiMetric = { key: string; value: number; previous: number | null; changePercent: number | null };

export type KpisData = { metrics: KpiMetric[] };

export type MessagesTrendData = { days: { date: string; incoming: number; outgoing: number }[] };

export type SignupsTrendData = { days: { date: string; count: number }[] };

export type ConversationsByChannelData = {
    total: number;
    items: { channelType: string | null; platform: { key: string; name: string }; count: number }[];
};

export type FunnelStep = { key: string; count: number; rateFromStart: number | null; rateFromPrevious: number | null };

export type ActivationFunnelData = { steps: FunnelStep[] };

export type CohortRetentionData = {
    weeks: number;
    cohorts: { week: string; size: number; retention: { offset: number; active: number; rate: number | null }[] }[];
};

export type ChannelHealthData = {
    total: number;
    healthy: number;
    failing: number;
    url: string;
    items: {
        inboxId: number;
        inboxName: string;
        accountName: string | null;
        platform: { key: string; name: string; logo_url?: string };
        problemLabel: string | null;
        severity?: 'warning' | 'error' | null;
        since: string | null;
        url: string;
    }[];
};

export type AccountListItem = { id: number; name: string; url: string };

export type TopAccountsData = { items: (AccountListItem & { messages: number })[] };

export type RecentSignupsData = {
    items: (AccountListItem & { createdAt: string; ownerEmail: string | null; inboxesCount: number })[];
};

export type QueueHealthData = {
    available: boolean;
    url: string;
    status: 'running' | 'paused' | 'inactive' | 'unavailable';
    pendingJobs: number | null;
    recentFailedJobs: number | null;
    failedJobs: number | null;
    processes: number | null;
    recentFailures: { id: string; name: string; queue: string; failedAt: string | null }[];
};

export type StickersData = {
    sharedPacks: number;
    sharedPublishedPacks: number;
    sharedStickers: number;
    accountsWithPrivateLibrary: number;
    privateStickers: number;
    url: string;
};

export type SystemData = {
    version: string;
    php: string;
    laravel: string;
    environment: string;
    databaseSizeBytes: number;
    tablesCount: number;
};
