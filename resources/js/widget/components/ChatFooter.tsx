import { useEffect, useRef, useState } from 'react';

import FluentIcon from 'shared/components/FluentIcon/FluentIcon';
import { emitter } from 'shared/helpers/emitter';

import { sendEmailTranscript } from '../api/widget';
import { WIDGET_BUS_EVENTS } from '../helpers/constants';
import { getContrastingTextColor } from '../helpers/colorHelper';
import { IFrameHelper } from '../helpers/iframe';
import { useWidgetState } from '../store/hooks';
import { widgetStore } from '../store/widgetStore';
import { t } from '../i18n';
import ChatInputWrap from './ChatInputWrap';
import { CHATWOOT_ON_START_CONVERSATION } from '../../sdk/constants/sdkEvents';
import type { AttachmentPayload, WidgetMessage } from '../types';

// Port từ widget/components/ChatFooter.vue + FooterReplyTo.vue.
const TRANSCRIPT_COOLDOWN_MS = 15000;

function FooterReplyTo({ inReplyTo, onDismiss }: { inReplyTo: WidgetMessage; onDismiss: () => void }) {
    const attachmentLabel = inReplyTo?.attachments?.length
        ? t(`ATTACHMENTS.${inReplyTo.attachments[0].file_type}.CONTENT`)
        : '';

    return (
        <div className="mb-2.5 rounded-[7px] bg-n-slate-3 px-2 py-1.5 text-sm text-n-slate-11 flex items-center gap-2">
            <div className="items-center flex-grow truncate">
                <strong>{t('FOOTER_REPLY_TO.REPLY_TO')}</strong> {inReplyTo.content || attachmentLabel}
            </div>
            <button
                type="button"
                className="items-end flex-shrink-0 p-1 rounded-md hover:bg-n-slate-5"
                onClick={onDismiss}
            >
                <FluentIcon icon="dismiss" size="12" />
            </button>
        </div>
    );
}

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

    const handleSendMessage = async (content: string) => {
        await widgetStore.sendMessage({ content, replyTo: inReplyTo ? inReplyTo.id : null });
        setInReplyTo(null);
        if (conversationSize === 0) await widgetStore.getConversationAttributes();
    };

    const handleSendAttachment = async (attachment: AttachmentPayload) => {
        await widgetStore.sendAttachment({ attachment, replyTo: inReplyTo ? inReplyTo.id : null });
        setInReplyTo(null);
    };

    const startNewConversation = () => {
        onStartNewConversation();
        IFrameHelper.sendMessage({
            event: 'onEvent',
            eventIdentifier: CHATWOOT_ON_START_CONVERSATION,
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
            className={`relative z-50 mb-1 px-5 ${!isWidgetStyleFlat ? 'rounded-lg' : ''} ${
                hasReplyTo
                    ? 'pt-2.5 shadow-[0px_-20px_20px_1px_rgba(0,_0,_0,_0.05)] dark:shadow-[0px_-20px_20px_1px_rgba(0,_0,_0,_0.15)] rounded-t-none'
                    : ''
            }`.trim()}
        >
            {hasReplyTo ? (
                <FooterReplyTo inReplyTo={inReplyTo as WidgetMessage} onDismiss={() => setInReplyTo(null)} />
            ) : null}
            <ChatInputWrap onSendMessage={handleSendMessage} onSendAttachment={handleSendAttachment} />
        </footer>
    );
}
