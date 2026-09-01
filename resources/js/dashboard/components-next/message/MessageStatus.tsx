import { useEffect, useState } from 'react';

import { t } from '../../../i18n';
import { MESSAGE_STATUS } from './constants';

// Port từ dashboard/components-next/message/MessageStatus.vue —
// đồng hồ xoay khi progress (useIntervalFn 500ms), check/check-check theo status.

const PROGRESS_ICON_SEQUENCE = [
    'i-lucide-clock-1',
    'i-lucide-clock-2',
    'i-lucide-clock-3',
    'i-lucide-clock-4',
    'i-lucide-clock-5',
    'i-lucide-clock-6',
    'i-lucide-clock-7',
    'i-lucide-clock-8',
    'i-lucide-clock-9',
    'i-lucide-clock-10',
    'i-lucide-clock-11',
    'i-lucide-clock-12',
];

const STATUS_ICON_MAP: Record<string, string> = {
    [MESSAGE_STATUS.SENT]: 'i-lucide-check',
    [MESSAGE_STATUS.DELIVERED]: 'i-lucide-check-check',
    [MESSAGE_STATUS.READ]: 'i-lucide-check-check',
};

const STATUS_COLOR_MAP: Record<string, string> = {
    [MESSAGE_STATUS.SENT]: 'text-n-slate-10',
    [MESSAGE_STATUS.DELIVERED]: 'text-n-slate-10',
    [MESSAGE_STATUS.READ]: 'text-[#7EB6FF]',
};

const STATUS_TOOLTIP_KEY: Record<string, string> = {
    [MESSAGE_STATUS.SENT]: 'CHAT_LIST.SENT',
    [MESSAGE_STATUS.DELIVERED]: 'CHAT_LIST.DELIVERED',
    [MESSAGE_STATUS.READ]: 'CHAT_LIST.MESSAGE_READ',
    [MESSAGE_STATUS.PROGRESS]: 'CHAT_LIST.SENDING',
};

export default function MessageStatus({ status }: { status: string }) {
    const [progressIconIndex, setProgressIconIndex] = useState(0);
    const isProgress = status === MESSAGE_STATUS.PROGRESS;

    useEffect(() => {
        if (!isProgress) return undefined;
        const timer = window.setInterval(() => {
            setProgressIconIndex((index) => (index + 1) % PROGRESS_ICON_SEQUENCE.length);
        }, 500);
        return () => window.clearInterval(timer);
    }, [isProgress]);

    const tooltipText = t(STATUS_TOOLTIP_KEY[status] ?? 'CHAT_LIST.SENDING');

    // v-tooltip của bản gốc nằm ngay trên Icon (không thêm element) → title trên span icon.
    if (isProgress) {
        return <span title={tooltipText} className={`${PROGRESS_ICON_SEQUENCE[progressIconIndex]} text-n-slate-10`} />;
    }

    return <span title={tooltipText} className={`${STATUS_ICON_MAP[status] ?? ''} size-[14px] ${STATUS_COLOR_MAP[status] ?? ''}`} />;
}
