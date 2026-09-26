import { useEffect } from 'react';

import { t } from '../i18n';
import Sheet from '../ui/Sheet';

export const FLOW_MESSAGE_PREFIX = 'yona-flow:';

interface WebviewSheetProps {
    title: string;
    url: string;
    onClose: () => void;
    onSubmitted: () => void;
}

/**
 * Trang công khai của Yona (chọn lịch, form dài, chuyển khoản…) trong sheet. Chỉ nhận
 * tin `yona-flow:*` từ chính origin Yona, vì trang và widget cùng domain; tin từ chỗ
 * khác (trang của shop, tiện ích trình duyệt) bị bỏ qua.
 */
export default function WebviewSheet({ title, url, onClose, onSubmitted }: WebviewSheetProps) {
    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            const type = (event.data as { type?: unknown } | null)?.type;
            if (typeof type !== 'string' || !type.startsWith(FLOW_MESSAGE_PREFIX)) return;

            if (type === `${FLOW_MESSAGE_PREFIX}submitted`) onSubmitted();
            if (type === `${FLOW_MESSAGE_PREFIX}close`) onClose();
        };
        window.addEventListener('message', onMessage);

        return () => window.removeEventListener('message', onMessage);
    }, [onClose, onSubmitted]);

    return (
        <Sheet label={title} onClose={onClose} tall>
            <div className="flex flex-none items-center gap-2 border-b border-[var(--yona-chat-line)] px-5 pb-3 pt-2">
                <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[17px] font-semibold text-[var(--yona-chat-ink)]">{title}</span>
                    <span className="flex items-center gap-1 text-[13px] text-[var(--yona-chat-ink-soft)]">
                        <span className="i-lucide-lock size-3" />
                        {new URL(url, window.location.href).host}
                    </span>
                </span>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('WEBVIEW_SHEET.OPEN_TAB')}
                    title={t('WEBVIEW_SHEET.OPEN_TAB')}
                    className="flex size-9 items-center justify-center rounded-full text-[var(--yona-chat-ink)]"
                >
                    <span className="i-lucide-external-link size-[18px]" />
                </a>
                {/* Artboard Webview: hai nút cạnh nhau cùng kiểu icon trần. */}
                <button
                    type="button"
                    aria-label={t('WEBVIEW_SHEET.CLOSE')}
                    title={t('WEBVIEW_SHEET.CLOSE')}
                    className="flex size-9 items-center justify-center rounded-full text-[var(--yona-chat-ink)]"
                    onClick={onClose}
                >
                    <span className="i-lucide-x size-[18px]" />
                </button>
            </div>
            <iframe
                src={url}
                title={title}
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
                className="min-h-0 w-full flex-1 border-0 bg-[var(--yona-chat-panel)]"
            />
        </Sheet>
    );
}
