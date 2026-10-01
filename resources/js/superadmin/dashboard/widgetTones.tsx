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

import { MEANING_TONE, type Tone } from '@admin/views/dashboards/tones';

// Ô biểu tượng cạnh tiêu đề mỗi ô: màu theo NGHĨA của nội dung ô (MEANING_TONE), cùng bảng màu với thẻ chỉ số.
// Ô trạng thái (sức khoẻ, cảnh báo, hàng đợi) không mang màu trạng thái cố định ở tiêu đề: màu trạng thái chỉ
// xuất hiện khi số liệu bên trong thật sự xấu. Key lạ thì không có ô biểu tượng.
export const WIDGET_BADGE: Record<string, { icon: ReactNode; tone: Tone }> = {
    messages_trend: { icon: <MessagesSquareIcon className="size-4" />, tone: MEANING_TONE.messages },
    conversations_by_channel: { icon: <PieChartIcon className="size-4" />, tone: MEANING_TONE.conversations },
    activation_funnel: { icon: <FilterIcon className="size-4" />, tone: MEANING_TONE.accounts },
    signups_trend: { icon: <UserPlusIcon className="size-4" />, tone: MEANING_TONE.accounts },
    cohort_retention: { icon: <Grid3x3Icon className="size-4" />, tone: MEANING_TONE.accounts },
    channel_health: { icon: <HeartPulseIcon className="size-4" />, tone: MEANING_TONE.inboxes },
    top_accounts: { icon: <TrophyIcon className="size-4" />, tone: MEANING_TONE.accounts },
    recent_signups: { icon: <BuildingIcon className="size-4" />, tone: MEANING_TONE.accounts },
    queue_health: { icon: <LayersIcon className="size-4" />, tone: MEANING_TONE.system },
    stickers: { icon: <SmileIcon className="size-4" />, tone: MEANING_TONE.system },
    system: { icon: <ServerIcon className="size-4" />, tone: MEANING_TONE.system },
    alerts: { icon: <BellIcon className="size-4" />, tone: MEANING_TONE.system },
    operation_links: { icon: <LinkIcon className="size-4" />, tone: MEANING_TONE.system },
};
