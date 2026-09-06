import { useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { IFrameHelper } from '../helpers/iframe';
import { useWidgetState } from '../store/hooks';
import { replaceRoute, WIDGET_ROUTES } from '../router';
import type { WidgetRouteName } from '../router';
import Banner from '../components/Banner';
import Branding from '../components/Branding';
import { ChatHeader, ChatHeaderExpanded } from '../components/ChatHeader';

// Port từ widget/components/layouts/ViewWithHeader.vue
const BACK_BUTTON_ROUTES: WidgetRouteName[] = [WIDGET_ROUTES.MESSAGES, WIDGET_ROUTES.PRECHAT_FORM];

function opacityClass(scrollPosition: number): string {
    if (scrollPosition > 30) return 'opacity-30';
    if (scrollPosition > 25) return 'opacity-40';
    if (scrollPosition > 20) return 'opacity-60';
    if (scrollPosition > 15) return 'opacity-80';
    if (scrollPosition > 10) return 'opacity-90';
    return '';
}

export default function ViewWithHeader({ route, children }: { route: WidgetRouteName; children: ReactNode }) {
    const channelConfig = useWidgetState(state => state.channelConfig);
    const appConfig = useWidgetState(state => state.appConfig);
    const agents = useWidgetState(state => state.agents);
    const [scrollPosition, setScrollPosition] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const availableAgents = agents.filter(agent => agent.availability_status === 'online');
    const hasIntroText = Boolean(channelConfig?.welcomeTitle || channelConfig?.welcomeTagline);
    const isOnHomeView = route === WIDGET_ROUTES.HOME;
    const isHeaderCollapsed = !hasIntroText || !isOnHomeView;
    const showBackButton = BACK_BUTTON_ROUTES.includes(route);

    return (
        <div
            ref={containerRef}
            className={`w-full h-full bg-n-slate-2 dark:bg-n-solid-1 ${isOnHomeView ? 'overflow-auto' : ''}`.trim()}
            onScroll={event => setScrollPosition((event.target as HTMLDivElement).scrollTop)}
            onKeyDown={event => {
                if (event.key === 'Escape') IFrameHelper.sendMessage({ event: 'closeWindow' });
            }}
        >
            <div className="relative flex flex-col h-full">
                <div
                    className={[
                        isHeaderCollapsed ? 'collapsed' : 'expanded',
                        isHeaderCollapsed
                            ? 'shadow-[0_10px_15px_-16px_rgba(50,50,93,0.08),0_4px_6px_-8px_rgba(50,50,93,0.04)]'
                            : opacityClass(scrollPosition),
                    ]
                        .filter(Boolean)
                        .join(' ')}
                >
                    {!isHeaderCollapsed ? (
                        <ChatHeaderExpanded
                            introHeading={appConfig.welcomeTitle || channelConfig?.welcomeTitle || ''}
                            introBody={appConfig.welcomeDescription || channelConfig?.welcomeTagline || ''}
                            avatarUrl={channelConfig?.avatarUrl}
                            showPopoutButton={appConfig.showPopoutButton}
                        />
                    ) : (
                        <ChatHeader
                            title={channelConfig?.websiteName ?? ''}
                            avatarUrl={channelConfig?.avatarUrl}
                            showPopoutButton={appConfig.showPopoutButton}
                            availableAgents={availableAgents}
                            showBackButton={showBackButton}
                            onBack={() => replaceRoute(WIDGET_ROUTES.HOME)}
                        />
                    )}
                </div>
                <Banner />
                {children}
                <Branding disableBranding={Boolean(channelConfig?.disableBranding)} />
            </div>
        </div>
    );
}
