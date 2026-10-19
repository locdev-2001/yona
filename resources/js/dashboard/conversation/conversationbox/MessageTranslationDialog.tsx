import { useEffect, useRef, useState } from 'react';

import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { getLocale, t } from '../../../i18n';
import { translateMessage } from '../api';
import type { ConversationMessage } from '../types';

// Bản dịch một tin sang ngôn ngữ giao diện của nhân viên, mở từ thao tác "Dịch"
// trên tin. Chỉ dựng khi account có dịch vụ dịch đang bật.

type TranslationState = { status: 'loading' } | { status: 'done'; content: string } | { status: 'failed' };

function storedTranslation(message: ConversationMessage, language: string): string | null {
    const translations = (message.content_attributes?.translations ?? {}) as Record<string, unknown>;
    const stored = translations[language];

    return typeof stored === 'string' && stored.trim() ? stored : null;
}

export default function MessageTranslationDialog({
    accountId,
    conversationId,
    message,
    onClose,
}: {
    accountId: number;
    conversationId: number;
    message: ConversationMessage;
    onClose: () => void;
}) {
    const dialogRef = useRef<DialogHandle>(null);
    const [translation, setTranslation] = useState<TranslationState>({ status: 'loading' });

    useEffect(() => {
        dialogRef.current?.open();
    }, []);

    useEffect(() => {
        const language = getLocale();
        let isCurrent = true;

        translateMessage(accountId, conversationId, message.id, language)
            .then(response => {
                const content = response?.content ?? storedTranslation(message, language);
                if (!isCurrent) return;
                setTranslation(content ? { status: 'done', content } : { status: 'failed' });
            })
            .catch(() => {
                if (isCurrent) setTranslation({ status: 'failed' });
            });

        return () => {
            isCurrent = false;
        };
    }, [accountId, conversationId, message]);

    return (
        <Dialog
            ref={dialogRef}
            type="edit"
            title={t('CONVERSATION.CONTEXT_MENU.TRANSLATE')}
            showConfirmButton={false}
            cancelButtonLabel={t('CONVERSATION.MESSAGE_ACTIONS.TRANSLATION.CLOSE')}
            isLoading={translation.status === 'loading'}
            onClose={onClose}
        >
            <div className="flex flex-col gap-3 text-sm">
                <p className="whitespace-pre-wrap text-n-slate-11">{message.content}</p>
                <p className="whitespace-pre-wrap text-n-slate-12" aria-live="polite">
                    {translation.status === 'loading'
                        ? t('CONVERSATION.MESSAGE_ACTIONS.TRANSLATION.LOADING')
                        : translation.status === 'done'
                          ? translation.content
                          : t('CONVERSATION.MESSAGE_ACTIONS.TRANSLATION.FAILED')}
                </p>
            </div>
        </Dialog>
    );
}
