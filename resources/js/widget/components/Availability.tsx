import { isInWorkingHours, isOnline as checkIsOnline } from '../helpers/availabilityHelpers';
import { useWidgetState } from '../store/hooks';
import { t } from '../i18n';
import type { AvailableAgent, WorkingHour } from '../types';

const DEFAULT_TIMEZONE = 'UTC';
const DEFAULT_REPLY_TIME = 'in_a_few_minutes';
// Khoá của cấu hình "Thời gian phản hồi" (App\Models\Channel\ReplyTime).
const REPLY_TIME_KEYS = ['in_a_few_minutes', 'in_a_few_hours', 'in_a_day'];

export interface InboxAvailabilityConfig {
    workingHours: WorkingHour[];
    workingHoursEnabled: boolean;
    utcOffset: string;
    replyTime: string;
}

export function useInboxAvailability(agents: AvailableAgent[]) {
    const channelConfig = useWidgetState(state => state.channelConfig);

    const inboxConfig: InboxAvailabilityConfig = {
        workingHours: channelConfig?.workingHours ?? [],
        workingHoursEnabled: channelConfig?.workingHoursEnabled ?? false,
        utcOffset: channelConfig?.utcOffset || channelConfig?.timezone || DEFAULT_TIMEZONE,
        replyTime: channelConfig?.replyTime || DEFAULT_REPLY_TIME,
    };

    const currentTime = new Date();
    const hasOnlineAgents = Array.isArray(agents) ? agents.length > 0 : false;

    return {
        inboxConfig,
        currentTime,
        hasOnlineAgents,
        isInWorkingHours: isInWorkingHours(currentTime, inboxConfig.utcOffset, inboxConfig.workingHours),
        isOnline: checkIsOnline(
            inboxConfig.workingHoursEnabled,
            currentTime,
            inboxConfig.utcOffset,
            inboxConfig.workingHours,
            hasOnlineAgents,
        ),
    };
}

// Câu "Thường trả lời sau …" theo cấu hình Thời gian phản hồi của hộp thư.
export const replyTimeLabel = (replyTime: string): string =>
    REPLY_TIME_KEYS.includes(replyTime) ? t(`REPLY_TIME.${replyTime.toUpperCase()}`) : t('HEADER.ONLINE');
