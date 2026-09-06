import { useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import LoadingState from 'dashboard/components/widgets/LoadingState';
import { useContactDetails } from 'dashboard/conversation/conversationbox/contact/useContactDetails';
import type { Conversation } from 'dashboard/conversation/types';
import type { DashboardApp } from 'dashboard/settings/integrations/DashboardApps/types';
import type { DashboardPageProps } from '../../../types';

// Port từ components/widgets/DashboardApp/Frame.vue — iframe nhận `appContext`
// qua postMessage khi tải xong, và mỗi lần trang nhúng hỏi lại
// (`chatwoot-dashboard-app:fetch-info`).
interface DashboardAppFrameProps {
    accountId: number;
    dashboardApp: DashboardApp;
    conversation: Conversation;
    isVisible: boolean;
    position: number;
}

export default function DashboardAppFrame({
    accountId,
    dashboardApp,
    conversation,
    isVisible,
    position,
}: DashboardAppFrameProps) {
    const { auth } = usePage<DashboardPageProps>().props;
    const [hasOpenedAtleastOnce, setHasOpenedAtleastOnce] = useState(isVisible);
    const [iframeLoading, setIframeLoading] = useState(true);
    const contextRef = useRef<Record<string, unknown>>({});

    const [contact] = useContactDetails(accountId, conversation.meta?.sender ?? { id: 0, name: '' });

    const currentAgent = auth.user
        ? { id: auth.user.id, name: auth.user.name, email: auth.user.email }
        : null;

    contextRef.current = { conversation, contact, currentAgent };

    const frameId = (index: number) => `dashboard-app--frame-${position}-${index}`;

    const postAppContext = (index: number) => {
        const frameElement = document.getElementById(frameId(index)) as HTMLIFrameElement | null;
        frameElement?.contentWindow?.postMessage(
            JSON.stringify({ event: 'appContext', data: contextRef.current }),
            '*',
        );
        setIframeLoading(false);
    };

    useEffect(() => {
        if (isVisible) setHasOpenedAtleastOnce(true);
    }, [isVisible]);

    useEffect(() => {
        const triggerEvent = (event: MessageEvent) => {
            if (!isVisible) return;
            if (event.data === 'chatwoot-dashboard-app:fetch-info') postAppContext(0);
        };

        window.addEventListener('message', triggerEvent);
        return () => window.removeEventListener('message', triggerEvent);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isVisible]);

    if (!hasOpenedAtleastOnce) return null;

    return (
        <div className="dashboard-app--container h-full w-full" style={{ display: isVisible ? undefined : 'none' }}>
            {(dashboardApp.content ?? []).map((configItem, index) => (
                <div key={index} className="dashboard-app--list h-full w-full">
                    {iframeLoading ? (
                        <LoadingState
                            message={t('DASHBOARD_APPS.LOADING_MESSAGE')}
                            className="dashboard-app_loading-container h-full w-full"
                        />
                    ) : null}
                    {configItem.type === 'frame' && configItem.url ? (
                        <iframe
                            id={frameId(index)}
                            title={dashboardApp.title}
                            src={configItem.url}
                            className="h-full w-full border-0"
                            onLoad={() => postAppContext(index)}
                        />
                    ) : null}
                </div>
            ))}
        </div>
    );
}
