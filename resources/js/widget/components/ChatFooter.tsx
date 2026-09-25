import { useEffect, useState } from 'react';

import { emitter } from 'shared/helpers/emitter';

import { WIDGET_BUS_EVENTS } from '../helpers/constants';
import { IFrameHelper } from '../helpers/iframe';
import { useWidgetState } from '../store/hooks';
import { widgetStore } from '../store/widgetStore';
import { t } from '../i18n';
import Branding from './Branding';
import ChatInputWrap from './ChatInputWrap';
import ReplyPreview from './composer/ReplyPreview';
import { useEmailTranscript } from './useEmailTranscript';
import { SDK_EVENTS } from '../../sdk/constants/sdkEvents';
import type { WidgetMessage, WidgetSticker } from '../types';

export default function ChatFooter({ onStartNewConversation }: { onStartNewConversation: () => void }) {
    const isWidgetStyleFlat = useWidgetState(state => state.appConfig.widgetStyle === 'flat');
    const conversationStatus = useWidgetState(state => state.conversationAttributes.status);
    const allowMessagesAfterResolved = useWidgetState(
        state => state.channelConfig?.allowMessagesAfterResolved ?? true,
    );
    const disableBranding = useWidgetState(state => Boolean(state.channelConfig?.disableBranding));
    const conversationSize = useWidgetState(state => Object.keys(state.conversations).length);

    const [inReplyTo, setInReplyTo] = useState<WidgetMessage | null>(null);
    const transcript = useEmailTranscript();

    useEffect(() => {
        const handler = (message: unknown) => setInReplyTo(message as WidgetMessage);
        emitter.on(WIDGET_BUS_EVENTS.TOGGLE_REPLY_TO_MESSAGE, handler);
        return () => {
            emitter.off(WIDGET_BUS_EVENTS.TOGGLE_REPLY_TO_MESSAGE, handler);
        };
    }, []);

    const hideReplyBox = !allowMessagesAfterResolved && conversationStatus === 'resolved';
    const hasReplyTo = Boolean(inReplyTo && (inReplyTo.content || inReplyTo.attachments));

    const replyToId = inReplyTo ? inReplyTo.id : null;

    const handleSendMessage = async (content: string) => {
        setInReplyTo(null);
        await widgetStore.sendMessage({ content, replyTo: replyToId });
        if (conversationSize === 0) await widgetStore.getConversationAttributes();
    };

    const handleSendFiles = async (files: File[], caption: string) => {
        setInReplyTo(null);
        await widgetStore.sendAttachments({ files, caption, replyTo: replyToId });
        if (conversationSize === 0) await widgetStore.getConversationAttributes();
    };

    const handleSendSticker = async (sticker: WidgetSticker) => {
        setInReplyTo(null);
        await widgetStore.sendSticker({ stickerId: sticker.id, replyTo: replyToId });
        if (conversationSize === 0) await widgetStore.getConversationAttributes();
    };

    const startNewConversation = () => {
        onStartNewConversation();
        IFrameHelper.sendMessage({
            event: 'onEvent',
            eventIdentifier: SDK_EVENTS.ON_START_CONVERSATION,
            data: { hasConversation: true },
        });
    };

    const branding = <Branding disableBranding={disableBranding} />;
    const footerClass = `relative z-50 border-t border-[var(--yona-chat-line)] bg-[var(--yona-chat-panel)] px-3.5 py-[11px] ${
        !isWidgetStyleFlat ? 'rounded-b-lg' : ''
    }`.trim();

    // Hội thoại đã kết thúc và hộp thư không cho nhắn tiếp: thay ô nhập bằng nút mở
    // hội thoại mới (điều kiện giữ nguyên, chỉ dựng lại theo token của khung chat).
    if (hideReplyBox) {
        return (
            <footer className={footerClass}>
                <button
                    type="button"
                    className="w-full min-h-11 rounded-[11px] p-3 text-[13.5px] font-semibold leading-none bg-[var(--yona-chat-accent)] text-[var(--yona-chat-on-accent)] active:scale-[0.97]"
                    onClick={startNewConversation}
                >
                    {t('START_NEW_CONVERSATION')}
                </button>
                {transcript.available ? (
                    <button
                        type="button"
                        className="mx-auto mt-1 flex min-h-11 items-center px-3 text-[11.5px] leading-[1.3] text-[var(--yona-chat-ink-soft)] hover:text-[var(--yona-chat-ink)] disabled:opacity-50 active:scale-[0.97]"
                        disabled={transcript.busy}
                        onClick={() => void transcript.send()}
                    >
                        {t('EMAIL_TRANSCRIPT.BUTTON_TEXT')}
                    </button>
                ) : null}
                {branding}
            </footer>
        );
    }

    return (
        <footer className={footerClass}>
            {hasReplyTo ? (
                <ReplyPreview message={inReplyTo as WidgetMessage} onDismiss={() => setInReplyTo(null)} />
            ) : null}
            <ChatInputWrap
                onSendMessage={handleSendMessage}
                onSendFiles={handleSendFiles}
                onSendSticker={handleSendSticker}
            />
            {branding}
        </footer>
    );
}
