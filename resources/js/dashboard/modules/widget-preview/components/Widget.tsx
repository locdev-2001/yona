import { useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';

import './Widget.scss';
import { t } from '../../../../i18n';
import { useBranding } from 'shared/composables/useBranding';
import Code from 'dashboard/components/Code';
import Switch from 'dashboard/components-next/switch/Switch';
import TabBar from 'dashboard/components-next/tabbar/TabBar';
import WidgetBody from './WidgetBody';
import WidgetFooter from './WidgetFooter';
import WidgetHead from './WidgetHead';
import { buildWidgetScript, replyTimeText } from '../widgetScript';
import type { WidgetPreviewConfig } from './types';
import type { SharedPageProps } from '../../../../types';

// Port từ dashboard/modules/widget-preview/components/Widget.vue
interface WidgetProps {
    welcomeHeading?: string;
    welcomeTagline?: string;
    websiteName: string;
    logo?: string;
    isOnline?: boolean;
    replyTime?: string;
    color?: string;
    widgetBubblePosition?: string;
    widgetBubbleLauncherTitle?: string;
    widgetBubbleType?: string;
    webWidgetScript?: string;
}

export default function Widget({
    welcomeHeading = '',
    welcomeTagline = '',
    websiteName,
    logo = '',
    isOnline = true,
    replyTime = '',
    color = '',
    widgetBubblePosition = '',
    widgetBubbleLauncherTitle = '',
    widgetBubbleType = '',
    webWidgetScript = '',
}: WidgetProps) {
    const { globalConfig } = usePage<SharedPageProps>().props;
    const { replaceInstallationName } = useBranding();

    const [isChatMode, setChatMode] = useState(false);
    const [isWidgetVisible, setWidgetVisible] = useState(true);
    const [activeTabIndex, setActiveTabIndex] = useState(0);

    const tabs = [
        { label: t('INBOX_MGMT.WIDGET_BUILDER.WIDGET_OPTIONS.WIDGET_VIEW_OPTION.PREVIEW'), value: 'preview' },
        { label: t('INBOX_MGMT.WIDGET_BUILDER.WIDGET_OPTIONS.WIDGET_VIEW_OPTION.SCRIPT'), value: 'script' },
    ];
    const isPreviewTab = activeTabIndex === 0;

    const widgetScript = useMemo(
        () =>
            buildWidgetScript(webWidgetScript, {
                position: widgetBubblePosition,
                type: widgetBubbleType,
                launcherTitle: widgetBubbleLauncherTitle,
            }),
        [webWidgetScript, widgetBubblePosition, widgetBubbleType, widgetBubbleLauncherTitle],
    );

    const widgetConfig: WidgetPreviewConfig = {
        welcomeHeading,
        welcomeTagline,
        websiteName,
        logo,
        isDefaultScreen: !isChatMode,
        isOnline,
        replyTime: replyTimeText(replyTime),
        color,
    };

    const isBubbleExpanded = !isWidgetVisible && widgetBubbleType === 'expanded_bubble';
    const bubbleLauncherTitle =
        isWidgetVisible || widgetBubbleType === 'standard' ? ' ' : widgetBubbleLauncherTitle;

    const handleToggleWidget = () => {
        const nextVisible = !isWidgetVisible;
        setWidgetVisible(nextVisible);
        if (nextVisible) setChatMode(false);
    };

    return (
        <div className="flex flex-col h-full min-h-0 flex-1">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <TabBar
                    tabs={tabs}
                    initialActiveTab={activeTabIndex}
                    onTabChanged={tab => setActiveTabIndex(tabs.findIndex(item => item.label === tab.label))}
                />

                {isPreviewTab ? (
                    <div className="flex items-center gap-2">
                        <span className="text-heading-3 text-n-slate-11">
                            {t('INBOX_MGMT.WIDGET_BUILDER.WIDGET_SCREEN.CHAT')}
                        </span>
                        <Switch value={isChatMode} onChange={setChatMode} />
                    </div>
                ) : null}
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
                {isPreviewTab ? (
                    <div className="flex-1 flex flex-col items-center justify-end pb-4">
                        {isWidgetVisible ? (
                            <div className="widget-wrapper flex flex-1 flex-shrink-0 flex-col justify-between rounded-lg shadow-md bg-n-slate-2 dark:bg-n-solid-1 h-[31.25rem] w-80 mb-4">
                                <WidgetHead config={widgetConfig} />
                                <div>
                                    {!widgetConfig.isDefaultScreen ? <WidgetBody config={widgetConfig} /> : null}
                                    <WidgetFooter config={widgetConfig} />
                                    <div className="py-2.5 flex justify-center">
                                        <a className="items-center gap-0.5 text-n-slate-11 cursor-pointer flex filter grayscale opacity-90 hover:grayscale-0 hover:opacity-100 text-xxs">
                                            <img className="max-w-2.5 max-h-2.5" src={globalConfig.logo} />
                                            <span>
                                                {replaceInstallationName(
                                                    t('INBOX_MGMT.WIDGET_BUILDER.BRANDING_TEXT'),
                                                )}
                                            </span>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <div
                            className="flex w-[320px]"
                            style={{ justifyContent: widgetBubblePosition === 'left' ? 'start' : 'end' }}
                        >
                            <button
                                className={`relative flex items-center justify-center rounded-full cursor-pointer ${
                                    isBubbleExpanded
                                        ? 'w-auto font-medium text-base text-white dark:text-white h-12 px-4'
                                        : 'w-16 h-16'
                                }`}
                                style={{ background: color }}
                                onClick={handleToggleWidget}
                            >
                                {!isWidgetVisible ? (
                                    <img
                                        src="/assets/images/dashboard/bubble-logo.svg"
                                        alt=""
                                        draggable={false}
                                        className="w-6 h-6 mx-auto"
                                    />
                                ) : null}
                                {isBubbleExpanded ? (
                                    <div className="ltr:pl-2.5 rtl:pr-2.5">{bubbleLauncherTitle}</div>
                                ) : null}
                                {isWidgetVisible ? (
                                    <div className="relative">
                                        <div className="absolute w-0.5 h-8 rotate-45 -translate-y-1/2 bg-white" />
                                        <div className="absolute w-0.5 h-8 -rotate-45 -translate-y-1/2 bg-white" />
                                    </div>
                                ) : null}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 p-3 rounded-lg [&_code]:!bg-n-slate-2 bg-n-slate-2 min-w-0 overflow-auto [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:whitespace-pre-wrap">
                        <Code
                            script={widgetScript}
                            lang="html"
                            className="!text-start"
                            codepenTitle={`${websiteName} - Widget Test`}
                            enableCodePen
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
