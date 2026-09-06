import FluentIcon from 'shared/components/FluentIcon/FluentIcon';

import { CONVERSATION_STATUS } from '../helpers/constants';
import { IFrameHelper } from '../helpers/iframe';
import { popoutChatWindow } from '../../sdk/helpers/popoutHelper';
import { useWidgetState } from '../store/hooks';
import { widgetStore } from '../store/widgetStore';
import { getAuthToken } from '../api/client';
import { t } from '../i18n';
import { SignOutIcon } from './icons';

// Port từ widget/components/HeaderActions.vue (bỏ nhánh React Native WebView —
// app RN không thuộc phạm vi nhóm C).
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
        <div className="actions flex items-center gap-3">
            {canLeaveConversation && canUserEndConversation && hasEndConversationEnabled && showEndConversationButton ? (
                <button
                    type="button"
                    className="button transparent compact"
                    title={t('END_CONVERSATION')}
                    onClick={() => void widgetStore.resolveConversation()}
                >
                    <SignOutIcon size="22" className="text-n-slate-12" />
                </button>
            ) : null}
            {showPopoutButton ? (
                <button
                    type="button"
                    className="button transparent compact new-window--button"
                    onClick={popoutWindow}
                >
                    <FluentIcon icon="open" size="22" className="text-n-slate-12" />
                </button>
            ) : null}
            <button type="button" className="button transparent compact close-button" onClick={closeWindow}>
                <FluentIcon icon="dismiss" size="24" className="text-n-slate-12" />
            </button>
        </div>
    );
}
