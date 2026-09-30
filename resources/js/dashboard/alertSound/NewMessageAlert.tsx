import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';

import { useRealtimeEvent } from 'dashboard/realtime/hooks';
import type { DashboardPageProps } from 'dashboard/types';
import { listenForFirstInteraction, playAlertTone } from './alertPlayer';
import { createAlertTabLock } from './alertTabLock';
import { agentAlertPreferenceOf } from './preference';
import { isAlertableMessage, shouldPlayAlert, type AlertableMessage } from './shouldPlayAlert';

type MessageCreatedPayload = AlertableMessage & { id: number };

// Một khoá cho cả vòng đời tab: Dashboard dựng lại mỗi lần chuyển trang Inertia.
const tabLock = createAlertTabLock();

const isThisTabActive = () => document.visibilityState === 'visible' && document.hasFocus();

/** Kêu âm báo khi khách nhắn tới, theo tuỳ chọn của nhân viên ở Hồ sơ → Tuỳ chọn thông báo. */
export default function NewMessageAlert() {
    const { auth } = usePage<DashboardPageProps>().props;
    const currentUserId = auth.user?.id;
    const preference = agentAlertPreferenceOf(auth.user?.ui_settings);

    useEffect(() => {
        listenForFirstInteraction();
    }, []);

    useRealtimeEvent<MessageCreatedPayload>('message.created', async message => {
        if (currentUserId === undefined || !isAlertableMessage(message, preference, currentUserId)) return;
        if (!(await tabLock.claim(`message:${message.id}`, isThisTabActive()))) return;

        const now = Date.now();
        const shouldPlay = shouldPlayAlert({
            message,
            preference,
            currentUserId,
            isTabActive: isThisTabActive(),
            lastPlayedAt: tabLock.lastPlayedAt(),
            now,
        });
        if (!shouldPlay) return;

        tabLock.markPlayed(now);
        playAlertTone(preference.tone);
    });

    return null;
}
