import { t } from '../i18n';
import PanelHeader from '../ui/PanelHeader';
import { startNewConversation } from './navigation';

// ponytail: loại yêu cầu cố định, chỉ để báo trước; khi làm thật thì lấy từ cấu hình hộp thư.
const KINDS = [
    { title: 'REQUEST.WARRANTY', hint: 'REQUEST.WARRANTY_HINT' },
    { title: 'REQUEST.RETURN', hint: 'REQUEST.RETURN_HINT' },
    { title: 'REQUEST.INVOICE', hint: 'REQUEST.INVOICE_HINT' },
];

/** "Gửi yêu cầu" chưa có: nói thật là sắp ra mắt, dẫn khách nhắn thẳng cho shop. */
export default function RequestScreen() {
    return (
        <div className="flex min-h-0 flex-1 flex-col bg-[var(--yona-chat-panel)]">
            <PanelHeader title={t('REQUEST.TITLE')} back />
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-4 no-scrollbar">
                <div className="flex flex-none gap-3 rounded-2xl border border-[var(--yona-chat-line)] p-4">
                    <span className="i-lucide-info mt-0.5 size-5 flex-none text-[var(--yona-chat-accent-ink)]" />
                    <span className="flex flex-col gap-1">
                        <span className="text-[15px] font-semibold text-[var(--yona-chat-ink)]">{t('REQUEST.NOTICE_TITLE')}</span>
                        <span className="text-[14px] leading-[21px] text-[var(--yona-chat-ink-soft)]">{t('REQUEST.NOTICE_BODY')}</span>
                    </span>
                </div>
                {KINDS.map(kind => (
                    <div key={kind.title} aria-disabled="true" className="flex flex-none items-center gap-3 rounded-2xl border border-[var(--yona-chat-line)] px-4 py-3">
                        <span className="i-lucide-lock size-[18px] flex-none text-[var(--yona-chat-ink-muted)]" />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="text-[15px] text-[var(--yona-chat-ink-soft)]">{t(kind.title)}</span>
                            <span className="text-[13px] text-[var(--yona-chat-ink-muted)]">{t(kind.hint)}</span>
                        </span>
                        <span className="rounded-md bg-[var(--yona-chat-field)] px-2 py-0.5 text-[12px] font-medium text-[var(--yona-chat-ink-soft)]">
                            {t('HOME.COMING_SOON')}
                        </span>
                    </div>
                ))}
                <button
                    type="button"
                    className="mt-1 flex h-12 flex-none items-center justify-center rounded-full bg-[var(--yona-chat-accent)] text-[15px] font-medium text-[var(--yona-chat-on-accent)] active:scale-[0.97]"
                    onClick={startNewConversation}
                >
                    {t('REQUEST.MESSAGE_SHOP')}
                </button>
            </div>
        </div>
    );
}
