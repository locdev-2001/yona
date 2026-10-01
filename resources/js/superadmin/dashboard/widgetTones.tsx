import {
    BellIcon,
    BuildingIcon,
    FilterIcon,
    Grid3x3Icon,
    HeartPulseIcon,
    LayersIcon,
    LinkIcon,
    MessagesSquareIcon,
    PieChartIcon,
    ServerIcon,
    SmileIcon,
    TrophyIcon,
    UserPlusIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import type { Tone } from '@admin/views/dashboards/tones';

// Ô biểu tượng cạnh tiêu đề mỗi ô: màu theo mạch (primary hội thoại, navy hồ sơ / dữ liệu,
// success tăng trưởng và sức khoẻ, warning kênh / nội dung). Key lạ thì không có ô biểu tượng.
export const WIDGET_BADGE: Record<string, { icon: ReactNode; tone: Tone }> = {
    messages_trend: { icon: <MessagesSquareIcon className="size-4" />, tone: 'primary' },
    conversations_by_channel: { icon: <PieChartIcon className="size-4" />, tone: 'warning' },
    activation_funnel: { icon: <FilterIcon className="size-4" />, tone: 'success' },
    signups_trend: { icon: <UserPlusIcon className="size-4" />, tone: 'success' },
    cohort_retention: { icon: <Grid3x3Icon className="size-4" />, tone: 'navy' },
    channel_health: { icon: <HeartPulseIcon className="size-4" />, tone: 'success' },
    top_accounts: { icon: <TrophyIcon className="size-4" />, tone: 'warning' },
    recent_signups: { icon: <BuildingIcon className="size-4" />, tone: 'navy' },
    queue_health: { icon: <LayersIcon className="size-4" />, tone: 'primary' },
    stickers: { icon: <SmileIcon className="size-4" />, tone: 'warning' },
    system: { icon: <ServerIcon className="size-4" />, tone: 'navy' },
    alerts: { icon: <BellIcon className="size-4" />, tone: 'danger' },
    operation_links: { icon: <LinkIcon className="size-4" />, tone: 'primary' },
};
