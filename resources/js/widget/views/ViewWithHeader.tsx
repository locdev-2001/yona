import type { ReactNode } from 'react';

import { IFrameHelper } from '../helpers/iframe';
import { useWidgetState } from '../store/hooks';
import { replaceRoute, WIDGET_ROUTES } from '../router';
import type { WidgetRouteName } from '../router';
import Banner from '../components/Banner';
import Branding from '../components/Branding';
import { ChatHeader } from '../components/ChatHeader';

const BACK_BUTTON_ROUTES: WidgetRouteName[] = [WIDGET_ROUTES.PRECHAT_FORM];

// Vỏ màn hình: header dính trên, nội dung co giãn ở giữa, ô nhập của từng view nằm dưới.
export default function ViewWithHeader({ route, children }: { route: WidgetRouteName; children: ReactNode }) {
    const channelConfig = useWidgetState(state => state.channelConfig);
    const appConfig = useWidgetState(state => state.appConfig);
    const agents = useWidgetState(state => state.agents);

    const availableAgents = agents.filter(agent => agent.availability_status === 'online');

    return (
        <div
            className="w-full h-full bg-[var(--yona-chat-surface)]"
            onKeyDown={event => {
                if (event.key === 'Escape') IFrameHelper.sendMessage({ event: 'closeWindow' });
            }}
        >
            <div className="relative flex flex-col h-full">
                <div className="sticky top-0 z-40 flex-shrink-0">
                    <ChatHeader
                        title={channelConfig?.websiteName ?? ''}
                        avatarUrl={channelConfig?.avatarUrl}
                        showPopoutButton={appConfig.showPopoutButton}
                        availableAgents={availableAgents}
                        showBackButton={BACK_BUTTON_ROUTES.includes(route)}
                        onBack={() => replaceRoute(WIDGET_ROUTES.HOME)}
                    />
                </div>
                <Banner />
                {children}
                <Branding disableBranding={Boolean(channelConfig?.disableBranding)} />
            </div>
        </div>
    );
}
