import FluentIcon from 'shared/components/FluentIcon/FluentIcon';

import { CONVERSATION_STATUS } from '../helpers/constants';
import { IFrameHelper } from '../helpers/iframe';
import { popoutChatWindow } from '../../sdk/helpers/popoutHelper';
import { useWidgetState } from '../store/hooks';
import { widgetStore } from '../store/widgetStore';
import { getAuthToken } from '../api/client';
import { t } from '../i18n';
import { SignOutIcon } from './icons';
import ResetSessionButton from './ResetSessionButton';
import { HEADER_ACTION_CLASS } from './headerActionClass';

export default function HeaderActions({
    showPopoutButton = false,
    showEndConversationButton = true,
}: {
    showPopoutButton?: boolean;
    showEndConversationButton?: boolean;
}) {
    const conversationStatus = useWidgetState(state => state.conversationAttributes.status);
    const canUserEndConversation = useWidgetState(state => state.appConfig.enableEndConversation);
    const enabledFeatures = useWidgetState(state => state.channelConfig?.enabledFeatures);
    const websiteToken = useWidgetState(state => state.channelConfig?.websiteToken ?? '');
    const locale = useWidgetState(state => state.channelConfig?.locale ?? 'en');
    const hasConversationHistory = useWidgetState(state => Object.keys(state.conversations).length > 0);

    const hasEndConversationEnabled = Boolean(enabledFeatures?.includes('end_conversation'));
    const canLeaveConversation = (
        [CONVERSATION_STATUS.OPEN, CONVERSATION_STATUS.SNOOZED, CONVERSATION_STATUS.PENDING] as string[]
    ).includes(conversationStatus);

    const isIframe = IFrameHelper.isIFrame();
    const hasWidgetOptions = showPopoutButton || conversationStatus === 'open';
    const showHeaderActions = isIframe || hasWidgetOptions;

    if (!showHeaderActions) return null;

    const closeWindow = () => {
        if (isIframe) IFrameHelper.sendMessage({ event: 'closeWindow' });
    };

    const popoutWindow = () => {
        closeWindow();
        popoutChatWindow(window.location.origin, websiteToken, locale, getAuthToken());
    };

    return (
        <div className="actions flex items-center flex-shrink-0">
            {canLeaveConversation && canUserEndConversation && hasEndConversationEnabled && showEndConversationButton ? (
                <button
                    type="button"
                    className={HEADER_ACTION_CLASS}
                    title={t('END_CONVERSATION')}
                    aria-label={t('END_CONVERSATION')}
                    onClick={() => void widgetStore.resolveConversation()}
                >
                    <SignOutIcon size="20" />
                </button>
            ) : null}
            {isIframe && hasConversationHistory ? <ResetSessionButton /> : null}
            {showPopoutButton ? (
                <button
                    type="button"
                    className={`${HEADER_ACTION_CLASS} new-window--button`}
                    onClick={popoutWindow}
                >
                    <FluentIcon icon="open" size="20" />
                </button>
            ) : null}
            <button
                type="button"
                aria-label={t('HEADER.CLOSE')}
                title={t('HEADER.CLOSE')}
                className={`${HEADER_ACTION_CLASS} close-button`}
                onClick={closeWindow}
            >
                <span className="i-lucide-chevron-down size-6" />
            </button>
        </div>
    );
}
