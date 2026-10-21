import { ICONS } from 'dashboard/icons';

import { t } from '../../../i18n';

// Nút tròn nổi ngay trên ô soạn, góc phải khung tin: đang đọc tin cũ thì bấm để
// về tin mới nhất; có tin mới đến trong lúc đó thì kèm số tin chưa xem.
export default function ScrollToLatestButton({ unseenCount, onClick }: { unseenCount: number; onClick: () => void }) {
    const label = t('CONVERSATION.SCROLL_TO_LATEST');

    return (
        <button
            type="button"
            data-testid="scroll-to-latest"
            title={label}
            aria-label={label}
            onClick={onClick}
            className="absolute -top-12 end-4 z-20 flex items-center gap-1.5 h-9 min-w-9 justify-center rounded-full overlay-surface px-2.5 text-n-slate-12 transition-transform hover:bg-n-slate-2 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-n-brand"
        >
            {unseenCount > 0 ? (
                <span className="text-xs font-medium text-n-brand">
                    {t('CONVERSATION.SCROLL_TO_LATEST_UNSEEN', { count: unseenCount })}
                </span>
            ) : null}
            <span className={`${ICONS.scrollToLatest} size-4`} aria-hidden="true" />
        </button>
    );
}
