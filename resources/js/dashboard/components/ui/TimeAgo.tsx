import { useEffect, useState } from 'react';

import { t } from '../../../i18n';
import { dateFormat, dynamicTime, shortTimestamp } from 'shared/helpers/timeHelper';

const MINUTE_IN_MILLI_SECONDS = 60000;
const HOUR_IN_MILLI_SECONDS = MINUTE_IN_MILLI_SECONDS * 60;
const DAY_IN_MILLI_SECONDS = HOUR_IN_MILLI_SECONDS * 24;

// Port từ dashboard/components/ui/TimeAgo.vue — v-tooltip thay bằng attr title.
interface TimeAgoProps {
    isAutoRefreshEnabled?: boolean;
    lastActivityTimestamp: number;
    createdAtTimestamp: number;
    conversationId?: number | string;
    className?: string;
}

function refreshDelay(lastActivityTimestamp: number): number {
    const timeDiff = Date.now() - lastActivityTimestamp * 1000;
    if (timeDiff > DAY_IN_MILLI_SECONDS) {
        return DAY_IN_MILLI_SECONDS;
    }
    if (timeDiff > HOUR_IN_MILLI_SECONDS) {
        return HOUR_IN_MILLI_SECONDS;
    }
    return MINUTE_IN_MILLI_SECONDS;
}

export default function TimeAgo({
    isAutoRefreshEnabled = true,
    lastActivityTimestamp,
    createdAtTimestamp,
    conversationId = '',
    className = '',
}: TimeAgoProps) {
    const [lastActivityAtTimeAgo, setLastActivityAtTimeAgo] = useState(() => dynamicTime(lastActivityTimestamp));
    const [createdAtTimeAgo, setCreatedAtTimeAgo] = useState(() => dynamicTime(createdAtTimestamp));

    useEffect(() => {
        const update = () => {
            setLastActivityAtTimeAgo(dynamicTime(lastActivityTimestamp));
            setCreatedAtTimeAgo(dynamicTime(createdAtTimestamp));
        };
        update();

        if (!isAutoRefreshEnabled) return undefined;

        let timer: number;
        const createTimer = () => {
            timer = window.setTimeout(() => {
                update();
                createTimer();
            }, refreshDelay(lastActivityTimestamp));
        };
        createTimer();

        return () => window.clearTimeout(timer);
    }, [lastActivityTimestamp, createdAtTimestamp, conversationId, isAutoRefreshEnabled]);

    const lastActivityTime = shortTimestamp(lastActivityTimestamp);
    const createdAtTime = shortTimestamp(createdAtTimestamp);

    const createdTimeDiff = Date.now() - createdAtTimestamp * 1000;
    const isBeforeAMonth = createdTimeDiff > DAY_IN_MILLI_SECONDS * 30;
    const createdAt = !isBeforeAMonth
        ? `${t('CHAT_LIST.CHAT_TIME_STAMP.CREATED.LATEST')} ${createdAtTimeAgo}`
        : `${t('CHAT_LIST.CHAT_TIME_STAMP.CREATED.OLDEST')} ${dateFormat(createdAtTimestamp)}`;

    const lastActivityTimeDiff = Date.now() - lastActivityTimestamp * 1000;
    const isNotActive = lastActivityTimeDiff > DAY_IN_MILLI_SECONDS * 30;
    const lastActivity = !isNotActive
        ? `${t('CHAT_LIST.CHAT_TIME_STAMP.LAST_ACTIVITY.ACTIVE')} ${lastActivityAtTimeAgo}`
        : `${t('CHAT_LIST.CHAT_TIME_STAMP.LAST_ACTIVITY.NOT_ACTIVE')} ${dateFormat(lastActivityTimestamp)}`;

    return (
        <div
            title={`${createdAt}\n${lastActivity}`}
            className={`ml-auto leading-4 text-xxs text-n-slate-10 hover:text-n-slate-11 ${className}`.trimEnd()}
        >
            <span>{`${createdAtTime} • ${lastActivityTime}`}</span>
        </div>
    );
}
