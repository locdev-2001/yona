import { useEffect, useRef, useState } from 'react';

import { emitter } from 'shared/helpers/emitter';

import { sendEmailTranscript } from '../api/widget';
import { WIDGET_BUS_EVENTS } from '../helpers/constants';
import { getContrastingTextColor } from '../helpers/colorHelper';
import { IFrameHelper } from '../helpers/iframe';
import { useWidgetState } from '../store/hooks';
import { widgetStore } from '../store/widgetStore';
import { t } from '../i18n';
import ChatInputWrap from './ChatInputWrap';
import ReplyPreview from './composer/ReplyPreview';
import { SDK_EVENTS } from '../../sdk/constants/sdkEvents';
import type { WidgetMessage, WidgetSticker } from '../types';

const TRANSCRIPT_COOLDOWN_MS = 15000;

export default function ChatFooter({ onStartNewConversation }: { onStartNewConversation: () => void }) {
    const widgetColor = useWidgetState(state => state.appConfig.widgetColor);
    const isWidgetStyleFlat = useWidgetState(state => state.appConfig.widgetStyle === 'flat');
    const conversationStatus = useWidgetState(state => state.conversationAttributes.status);
    const allowMessagesAfterResolved = useWidgetState(
        state => state.channelConfig?.allowMessagesAfterResolved ?? true,
    );
    const hasEmail = useWidgetState(state => Boolean(state.contact?.has_email));
    const conversationSize = useWidgetState(state => Object.keys(state.conversations).length);

    const [inReplyTo, setInReplyTo] = useState<WidgetMessage | null>(null);
    const [isSendingTranscript, setSendingTranscript] = useState(false);
    const [transcriptCooldown, setTranscriptCooldown] = useState(false);
    const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const handler = (message: unknown) => setInReplyTo(message as WidgetMessage);
        emitter.on(WIDGET_BUS_EVENTS.TOGGLE_REPLY_TO_MESSAGE, handler);
        return () => {
            emitter.off(WIDGET_BUS_EVENTS.TOGGLE_REPLY_TO_MESSAGE, handler);
            if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
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

    const sendTranscript = async () => {
        if (!hasEmail || isSendingTranscript || transcriptCooldown) return;
        setSendingTranscript(true);
        try {
            await sendEmailTranscript();
            setTranscriptCooldown(true);
            if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
            cooldownTimer.current = setTimeout(() => setTranscriptCooldown(false), TRANSCRIPT_COOLDOWN_MS);
            widgetStore.showBanner({ message: t('EMAIL_TRANSCRIPT.SEND_EMAIL_SUCCESS'), type: 'success' });
        } catch {
            widgetStore.showBanner({ message: t('EMAIL_TRANSCRIPT.SEND_EMAIL_ERROR'), type: 'error' });
        } finally {
            setSendingTranscript(false);
        }
    };

    if (hideReplyBox) {
        return (
            <div>
                {/* shared/components/Button.vue: type mặc định + block + màu widget. */}
                <button
                    type="button"
                    className="text-white py-3 px-4 rounded-lg shadow-sm leading-4 cursor-pointer disabled:opacity-50 w-full font-medium"
                    style={{ backgroundColor: widgetColor, color: getContrastingTextColor(widgetColor) }}
                    onClick={startNewConversation}
                >
                    {t('START_NEW_CONVERSATION')}
                </button>
                {hasEmail ? (
                    <button
                        type="button"
                        className="flex mx-auto mt-4 text-xs leading-3 w-auto text-n-gray-12 font-normal disabled:opacity-50"
                        disabled={isSendingTranscript || transcriptCooldown}
                        onClick={sendTranscript}
                    >
                        {t('EMAIL_TRANSCRIPT.BUTTON_TEXT')}
                    </button>
                ) : null}
            </div>
        );
    }

    return (
        <footer
            className={`relative z-50 border-t border-[var(--yona-chat-line)] bg-[var(--yona-chat-panel)] ${
                !isWidgetStyleFlat ? 'rounded-b-lg' : ''
            }`.trim()}
        >
            {hasReplyTo ? (
                <ReplyPreview message={inReplyTo as WidgetMessage} onDismiss={() => setInReplyTo(null)} />
            ) : null}
            <ChatInputWrap
                onSendMessage={handleSendMessage}
                onSendFiles={handleSendFiles}
                onSendSticker={handleSendSticker}
            />
        </footer>
    );
}
