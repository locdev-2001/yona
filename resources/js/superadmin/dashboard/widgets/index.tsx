import type { ReactNode } from 'react';

import type {
    ActivationFunnelData,
    ChannelHealthData,
    CohortRetentionData,
    ConversationsByChannelData,
    KpisData,
    MessagesTrendData,
    QueueHealthData,
    RecentSignupsData,
    SignupsTrendData,
    StickersData,
    SystemData,
    TopAccountsData,
} from '../types';
import { CohortRetention } from './cohort';
import { ChannelHealth, RecentSignups, TopAccounts } from './lists';
import { ActivationFunnel, ConversationsByChannel, Kpis, MessagesTrend, SignupsTrend } from './metrics';
import { QueueHealth, Stickers, System } from './system';

export type SkeletonKind = 'stats' | 'chart' | 'list';

type Renderer<T> = {
    render: (data: T, title: string) => ReactNode;
    isEmpty?: (data: T) => boolean;
    skeleton: SkeletonKind;
};

export type AnyRenderer = Renderer<unknown>;

const define = <T,>(renderer: Renderer<T>) => renderer as unknown as AnyRenderer;

const allZero = (values: number[]) => values.every(value => value === 0);

// Ô do máy chủ tính số: key → cách vẽ. Key lạ (máy chủ có, bản build chưa có) bị bỏ qua.
export const SERVER_WIDGETS: Record<string, AnyRenderer> = {
    kpis: define<KpisData>({ render: data => <Kpis data={data} />, skeleton: 'stats' }),
    messages_trend: define<MessagesTrendData>({
        render: (data, title) => <MessagesTrend data={data} title={title} />,
        isEmpty: data => allZero(data.days.flatMap(day => [day.incoming, day.outgoing])),
        skeleton: 'chart',
    }),
    conversations_by_channel: define<ConversationsByChannelData>({
        render: data => <ConversationsByChannel data={data} />,
        isEmpty: data => data.items.length === 0,
        skeleton: 'list',
    }),
    activation_funnel: define<ActivationFunnelData>({
        render: (data, title) => <ActivationFunnel data={data} title={title} />,
        isEmpty: data => (data.steps[0]?.count ?? 0) === 0,
        skeleton: 'list',
    }),
    signups_trend: define<SignupsTrendData>({
        render: (data, title) => <SignupsTrend data={data} title={title} />,
        isEmpty: data => allZero(data.days.map(day => day.count)),
        skeleton: 'chart',
    }),
    cohort_retention: define<CohortRetentionData>({
        render: (data, title) => <CohortRetention data={data} title={title} />,
        isEmpty: data => data.cohorts.every(cohort => cohort.size === 0),
        skeleton: 'chart',
    }),
    channel_health: define<ChannelHealthData>({
        render: data => <ChannelHealth data={data} />,
        isEmpty: data => data.total === 0,
        skeleton: 'list',
    }),
    top_accounts: define<TopAccountsData>({
        render: data => <TopAccounts data={data} />,
        isEmpty: data => data.items.length === 0,
        skeleton: 'list',
    }),
    recent_signups: define<RecentSignupsData>({
        render: data => <RecentSignups data={data} />,
        isEmpty: data => data.items.length === 0,
        skeleton: 'list',
    }),
    queue_health: define<QueueHealthData>({ render: data => <QueueHealth data={data} />, skeleton: 'list' }),
    stickers: define<StickersData>({ render: data => <Stickers data={data} />, skeleton: 'list' }),
    system: define<SystemData>({ render: data => <System data={data} />, skeleton: 'list' }),
};
