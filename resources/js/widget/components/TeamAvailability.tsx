import { IFrameHelper } from '../helpers/iframe';
import { useWidgetState } from '../store/hooks';
import { t } from '../i18n';
import AvailabilityContainer from './Availability';
import { CHATWOOT_ON_START_CONVERSATION } from '../../sdk/constants/sdkEvents';
import type { AvailableAgent } from '../types';

// Port từ widget/components/TeamAvailability.vue
interface TeamAvailabilityProps {
    availableAgents: AvailableAgent[];
    hasConversation: boolean;
    onStartConversation: () => void;
}

export default function TeamAvailability({
    availableAgents,
    hasConversation,
    onStartConversation,
}: TeamAvailabilityProps) {
    const widgetColor = useWidgetState(state => state.appConfig.widgetColor);

    const startConversation = () => {
        onStartConversation();
        if (!hasConversation) {
            IFrameHelper.sendMessage({
                event: 'onEvent',
                eventIdentifier: CHATWOOT_ON_START_CONVERSATION,
                data: { hasConversation: false },
            });
        }
    };

    return (
        <div className="flex flex-col gap-3 w-full shadow outline-1 outline outline-n-container rounded-xl bg-n-background dark:bg-n-solid-2 px-5 py-4">
            <AvailabilityContainer agents={availableAgents} showHeader showAvatars />

            <button
                type="button"
                className="inline-flex items-center gap-1 font-medium text-n-slate-12"
                style={{ color: widgetColor }}
                onClick={startConversation}
            >
                <span>{hasConversation ? t('CONTINUE_CONVERSATION') : t('START_CONVERSATION')}</span>
                <i className="i-lucide-chevron-right size-5 mt-px rtl:rotate-180" />
            </button>
        </div>
    );
}
