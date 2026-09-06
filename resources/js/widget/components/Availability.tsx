import Avatar from 'dashboard/components-next/avatar/Avatar';

import {
    findNextAvailableSlotDetails,
    getTime,
    isInWorkingHours,
    isOnline as checkIsOnline,
} from '../helpers/availabilityHelpers';
import { useWidgetState } from '../store/hooks';
import { t } from '../i18n';
import type { AvailableAgent, WorkingHour } from '../types';

// Port từ widget/components/Availability/{AvailabilityContainer,AvailabilityText}.vue,
// widget/composables/useAvailability.js và widget/components/GroupedAvatars.vue.

const DEFAULT_TIMEZONE = 'UTC';
const DEFAULT_REPLY_TIME = 'in_a_few_minutes';
const MINUTE_ROUNDING_INTERVAL = 5;
const HOUR_THRESHOLD_FOR_EXACT_TIME = 3;
const MINUTES_IN_HOUR = 60;

const DAY_NAME_KEYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

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

interface AvailabilityTextProps {
    time: Date;
    utcOffset: string;
    workingHours: WorkingHour[];
    workingHoursEnabled: boolean;
    replyTime: string;
    isOnline: boolean;
    isInWorkingHours: boolean;
    className?: string;
}

function AvailabilityText({
    time,
    utcOffset,
    workingHours,
    workingHoursEnabled,
    replyTime,
    isOnline,
    isInWorkingHours: inWorkingHours,
    className = '',
}: AvailabilityTextProps) {
    const replyTimeMessage = t(`REPLY_TIME.${replyTime.toUpperCase()}`);
    const allDayClosed = workingHours.length > 0 && workingHours.every(slot => slot.closedAllDay);

    const slot =
        !workingHoursEnabled || allDayClosed || (inWorkingHours && isOnline)
            ? null
            : findNextAvailableSlotDetails(time, utcOffset, workingHours);

    const nextSlot = slot
        ? {
              ...slot,
              hoursUntilOpen: Math.floor(slot.minutesUntilOpen / MINUTES_IN_HOUR),
              remainingMinutes: slot.minutesUntilOpen % MINUTES_IN_HOUR,
          }
        : null;

    const content = (): string => {
        if (inWorkingHours) return replyTimeMessage;
        if (!workingHoursEnabled) {
            return isOnline ? replyTimeMessage : t('TEAM_AVAILABILITY.BACK_AS_SOON_AS_POSSIBLE');
        }
        if (allDayClosed) return t('TEAM_AVAILABILITY.BACK_AS_SOON_AS_POSSIBLE');
        if (!nextSlot) return t('REPLY_TIME.BACK_IN_SOME_TIME');
        if (nextSlot.daysUntilOpen === 1) return t('REPLY_TIME.BACK_TOMORROW');
        if (nextSlot.daysUntilOpen > 1) {
            return t('REPLY_TIME.BACK_ON_DAY', { day: t(`DAY_NAMES.${DAY_NAME_KEYS[nextSlot.config.dayOfWeek]}`) });
        }
        if (nextSlot.hoursUntilOpen === 0) {
            const minutes =
                Math.ceil(nextSlot.remainingMinutes / MINUTE_ROUNDING_INTERVAL) * MINUTE_ROUNDING_INTERVAL;
            return t('REPLY_TIME.BACK_IN_MINUTES', { time: `${minutes}` });
        }
        if (nextSlot.hoursUntilOpen < HOUR_THRESHOLD_FOR_EXACT_TIME) {
            const hours = nextSlot.remainingMinutes > 0 ? nextSlot.hoursUntilOpen + 1 : nextSlot.hoursUntilOpen;
            return t('REPLY_TIME.BACK_IN_HOURS', { n: hours });
        }
        return t('REPLY_TIME.BACK_AT_TIME', {
            time: getTime(nextSlot.config.openHour || 0, nextSlot.config.openMinutes || 0),
        });
    };

    return <span className={`text-n-slate-11 ${className}`.trim()}>{content()}</span>;
}

function GroupedAvatars({ users, limit = 4 }: { users: AvailableAgent[]; limit?: number }) {
    return (
        <div className="flex">
            {users.slice(0, limit).map((user, index) => (
                <span
                    key={user.id}
                    className={`inline-block rounded-full text-white shadow-solid ${
                        index ? 'ltr:-ml-4 rtl:-mr-4' : ''
                    }`.trim()}
                >
                    <Avatar
                        name={user.name}
                        src={user.avatar_url}
                        size={36}
                        className="[&>span]:outline [&>span]:outline-1 [&>span]:outline-n-background"
                        roundedFull
                    />
                </span>
            ))}
        </div>
    );
}

interface AvailabilityContainerProps {
    agents: AvailableAgent[];
    showHeader?: boolean;
    showAvatars?: boolean;
    textClasses?: string;
}

export default function AvailabilityContainer({
    agents,
    showHeader = true,
    showAvatars = true,
    textClasses = '',
}: AvailabilityContainerProps) {
    const availableMessage = useWidgetState(state => state.appConfig.availableMessage);
    const unavailableMessage = useWidgetState(state => state.appConfig.unavailableMessage);
    const { inboxConfig, currentTime, isOnline, isInWorkingHours: inWorkingHours } = useInboxAvailability(agents);

    const isAvailable = isOnline || (inboxConfig.workingHoursEnabled && inWorkingHours);
    const headerText = isAvailable
        ? availableMessage || t('TEAM_AVAILABILITY.ONLINE')
        : unavailableMessage || t('TEAM_AVAILABILITY.OFFLINE');

    return (
        <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-1">
                {showHeader ? <div className="font-medium text-n-slate-12">{headerText}</div> : null}
                <AvailabilityText
                    time={currentTime}
                    utcOffset={inboxConfig.utcOffset}
                    workingHours={inboxConfig.workingHours}
                    workingHoursEnabled={inboxConfig.workingHoursEnabled}
                    replyTime={inboxConfig.replyTime}
                    isOnline={isOnline}
                    isInWorkingHours={inWorkingHours}
                    className={textClasses}
                />
            </div>
            {showAvatars && isOnline ? <GroupedAvatars users={agents} /> : null}
        </div>
    );
}
