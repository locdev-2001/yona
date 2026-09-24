import { useEffect } from 'react';

import { IFrameHelper } from '../helpers/iframe';
import { useWidgetState } from '../store/hooks';
import { replaceRoute, WIDGET_ROUTES } from '../router';
import { t } from '../i18n';
import ChatEmptyState from '../components/ChatEmptyState';
import { SDK_EVENTS } from '../../sdk/constants/sdkEvents';

// Không còn màn chủ riêng: vào thẳng khung chat. Chỉ dừng ở đây khi hộp thư bắt
// điền form trước cuộc trò chuyện đầu tiên.
export default function Home() {
    const hasChannelConfig = useWidgetState(state => Boolean(state.channelConfig));
    const conversationSize = useWidgetState(state => Object.keys(state.conversations).length);
    const preChatFormEnabled = useWidgetState(state => Boolean(state.channelConfig?.preChatFormEnabled));

    const needsPreChatForm = preChatFormEnabled && !conversationSize;

    useEffect(() => {
        if (hasChannelConfig && !needsPreChatForm) replaceRoute(WIDGET_ROUTES.MESSAGES);
    }, [hasChannelConfig, needsPreChatForm]);

    if (!needsPreChatForm) return null;

    const startConversation = () => {
        replaceRoute(WIDGET_ROUTES.PRECHAT_FORM);
        IFrameHelper.sendMessage({
            event: 'onEvent',
            eventIdentifier: SDK_EVENTS.ON_START_CONVERSATION,
            data: { hasConversation: false },
        });
    };

    return (
        <div className="flex flex-col flex-1 bg-[var(--yona-chat-surface)]">
            <ChatEmptyState />
            <div className="p-4 bg-[var(--yona-chat-panel)] border-t border-[var(--yona-chat-line)]">
                <button
                    type="button"
                    className="w-full min-h-11 rounded-full font-medium bg-[var(--yona-chat-accent)] text-[var(--yona-chat-on-accent)]"
                    onClick={startConversation}
                >
                    {t('START_CONVERSATION')}
                </button>
            </div>
        </div>
    );
}
