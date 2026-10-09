import { useState } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';
import Loader from 'shared/components/loader/Loader';
import { t } from '../../../i18n';
import { useMessageContext } from './provider';
import { ORIENTATION } from './constants';
import { canRetryMessage, readExternalError } from './helpers/retry';
import { isUnsentMessageId } from 'dashboard/conversation/pendingMessages';

// Port từ components-next/message/MessageError.vue. Thêm so với gốc: gợi ý theo
// `external_error.code` có cấu trúc của kênh khai `outbound_retry`
// (reports/zalo-lo3-notes.md) và trạng thái "đang gửi lại" cho nút.

export default function MessageError({
    className = '',
    onRetry,
}: {
    className?: string;
    onRetry?: () => Promise<void> | void;
}) {
    const { id, orientation, status, createdAt, content, attachments, contentAttributes, onDeleteMessage } =
        useMessageContext();
    const [isRetrying, setIsRetrying] = useState(false);

    const error = readExternalError(contentAttributes.external_error);
    if (!error) return null;

    const hint = error.code ? t(`CONVERSATION.MESSAGE_FAILURE.HINT.${error.code}`) : '';
    // t() trả về chính khoá khi không có bản dịch — mã lạ thì không hiện gợi ý.
    const hintText = hint && !hint.startsWith('CONVERSATION.') ? hint : '';
    const detail = [error.message, hintText].filter(Boolean).join(' — ');

    const canRetry =
        Boolean(onRetry) &&
        canRetryMessage({
            status,
            code: error.code,
            createdAt,
            hasContent: content !== null && content !== '',
            hasAttachments: attachments.length > 0,
        });

    // Tin chưa tới máy chủ chỉ nằm ở máy: bỏ đi là xong, không cần hỏi lại.
    const canDiscard = Boolean(onDeleteMessage) && isUnsentMessageId(id);

    const handleRetry = async () => {
        if (isRetrying) return;
        setIsRetrying(true);
        try {
            await onRetry?.();
        } finally {
            setIsRetrying(false);
        }
    };

    return (
        <div className={`text-xs text-n-ruby-11 flex items-center gap-1.5 ${className}`.trim()}>
            <span>{t('CHAT_LIST.FAILED_TO_SEND')}</span>
            <div className="relative group">
                <div className="bg-n-alpha-2 rounded-md size-5 grid place-content-center cursor-help" title={detail}>
                    <Icon icon="i-lucide-triangle-alert" className="text-n-ruby-11 size-[14px]" />
                </div>
                {detail ? (
                    <div
                        className={`absolute bg-n-alpha-3 px-4 py-3 border rounded-xl border-n-strong text-n-slate-12 bottom-6 w-52 text-xs backdrop-blur-[100px] shadow-[0px_0px_24px_0px_rgba(0,0,0,0.12)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 break-words z-10 ${
                            orientation === ORIENTATION.LEFT ? 'ltr:left-0 rtl:right-0' : 'ltr:right-0 rtl:left-0'
                        }`}
                    >
                        {detail}
                    </div>
                ) : null}
            </div>
            {canRetry ? (
                <button
                    type="button"
                    disabled={isRetrying}
                    title={t('CONVERSATION.MESSAGE_FAILURE.RETRY')}
                    aria-label={t('CONVERSATION.MESSAGE_FAILURE.RETRY')}
                    className="bg-n-alpha-2 rounded-md h-5 px-1.5 inline-flex items-center gap-1 cursor-pointer disabled:opacity-60 disabled:cursor-default hover:bg-n-alpha-3 transition-colors duration-150"
                    onClick={handleRetry}
                >
                    {isRetrying ? (
                        <Loader size={14} className="text-n-ruby-11" />
                    ) : (
                        <Icon icon="i-lucide-refresh-ccw" className="text-n-ruby-11 size-[14px]" />
                    )}
                    <span className="text-n-ruby-11">{t('CONVERSATION.MESSAGE_FAILURE.RETRY')}</span>
                </button>
            ) : null}
            {canDiscard ? (
                <button
                    type="button"
                    disabled={isRetrying}
                    className="bg-n-alpha-2 rounded-md h-5 px-1.5 inline-flex items-center gap-1 cursor-pointer disabled:opacity-60 disabled:cursor-default hover:bg-n-alpha-3 transition-colors duration-150 text-n-ruby-11"
                    onClick={onDeleteMessage}
                >
                    <Icon icon="i-lucide-trash-2" className="size-[14px]" />
                    <span>{t('CONVERSATION.MESSAGE_ACTIONS.DELETE')}</span>
                </button>
            ) : null}
        </div>
    );
}
