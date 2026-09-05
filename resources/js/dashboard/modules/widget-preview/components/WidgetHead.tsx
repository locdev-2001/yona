import DOMPurify from 'dompurify';

import MessageFormatter from 'shared/helpers/MessageFormatter';
import type { WidgetPreviewConfig } from './types';

// Port từ dashboard/modules/widget-preview/components/WidgetHead.vue
interface WidgetHeadProps {
    config: WidgetPreviewConfig;
}

export default function WidgetHead({ config }: WidgetHeadProps) {
    const isDefaultScreen =
        config.isDefaultScreen &&
        Boolean(
            (config.welcomeHeading && config.welcomeHeading.length !== 0) ||
                (config.welcomeTagLine && config.welcomeTagline.length !== 0),
        );

    return (
        <div
            className={`rounded-t-lg flex-shrink-0 transition-[max-height] duration-300 ${
                isDefaultScreen
                    ? 'bg-n-slate-2 dark:bg-n-solid-1 px-4 py-5'
                    : 'bg-n-slate-2 dark:bg-n-solid-1 p-4'
            }`}
        >
            <div className="relative top-px">
                <div className="flex items-center justify-start">
                    {config.logo ? (
                        <img
                            src={config.logo}
                            className={`mr-2 rounded-full logo ${isDefaultScreen ? 'h-12 w-12 mb-2' : 'h-8 w-8 mb-1'}`}
                        />
                    ) : null}
                    {!isDefaultScreen ? (
                        <div>
                            <div className="flex items-center justify-start gap-1">
                                <span className="text-base font-medium leading-3 text-n-slate-12">
                                    {config.websiteName}
                                </span>
                                {config.isOnline ? (
                                    <div className="w-2 h-2 bg-n-teal-10 rounded-full" />
                                ) : null}
                            </div>
                            <span className="mt-1 text-xs text-n-slate-11">{config.replyTime}</span>
                        </div>
                    ) : null}
                </div>
                {isDefaultScreen ? (
                    <div className="overflow-auto max-h-60">
                        <h2 className="mb-2 text-2xl break-words text-n-slate-12">{config.welcomeHeading}</h2>
                        <p
                            className="text-sm break-words text-n-slate-11 [&_a]:!text-n-slate-11 [&_a]:underline"
                            dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(
                                    new MessageFormatter(config.welcomeTagline).formattedMessage,
                                ),
                            }}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
}
