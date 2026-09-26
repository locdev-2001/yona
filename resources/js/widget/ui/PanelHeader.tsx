import type { ReactNode } from 'react';

import { HEADER_ACTION_CLASS } from '../components/headerActionClass';
import { IFrameHelper } from '../helpers/iframe';
import { t } from '../i18n';
import { canGoBack, popRoute } from '../router';
import { useWidgetState } from '../store/hooks';
import { toggleExpanded, useExpanded } from './expanded';

/** Nút phóng to/thu nhỏ panel (chỉ khung nổi trên máy tính, khi tenant bật). */
export function ExpandButton({ tone = 'ink' }: { tone?: 'ink' | 'on-accent' }) {
    const enabled = useWidgetState(state => state.channelConfig?.widgetSettings?.expanded_enabled ?? false);
    const expanded = useExpanded();

    if (!enabled || !IFrameHelper.isIFrame()) return null;

    return (
        <button
            type="button"
            className={`${HEADER_ACTION_CLASS} ${tone === 'on-accent' ? 'yona-expand-button !text-[var(--yona-chat-on-accent)] hover:!bg-white/15' : 'yona-expand-button'}`}
            aria-label={expanded ? t('NAV.COLLAPSE') : t('NAV.EXPAND')}
            title={expanded ? t('NAV.COLLAPSE') : t('NAV.EXPAND')}
            onClick={toggleExpanded}
        >
            <span className={`${expanded ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'} size-[18px]`} />
        </button>
    );
}

/** Nút đóng khung chat — chỉ khi widget nằm trong iframe của trang khách. */
export function CloseButton({ tone = 'ink' }: { tone?: 'ink' | 'on-accent' }) {
    if (!IFrameHelper.isIFrame()) return null;

    return (
        <button
            type="button"
            className={`${HEADER_ACTION_CLASS} ${tone === 'on-accent' ? '!text-[var(--yona-chat-on-accent)] hover:!bg-white/15' : ''}`}
            aria-label={t('NAV.CLOSE')}
            title={t('NAV.CLOSE')}
            onClick={() => IFrameHelper.sendMessage({ event: 'closeWindow' })}
        >
            <span className="i-lucide-x size-5" />
        </button>
    );
}

export function BackButton() {
    if (!canGoBack()) return null;

    return (
        <button type="button" className={HEADER_ACTION_CLASS} aria-label={t('NAV.BACK')} title={t('NAV.BACK')} onClick={popRoute}>
            <span className="i-lucide-chevron-left size-5" />
        </button>
    );
}

/**
 * Header màn danh sách (Tin nhắn, Trợ giúp, Cập nhật): tiêu đề lớn + phóng to + đóng.
 * `crumb`: màn con (bài viết, danh mục) — chữ nhỏ dẫn đường thay cho tiêu đề lớn.
 */
export default function PanelHeader({
    title,
    back = false,
    crumb = false,
    children,
}: {
    title: ReactNode;
    back?: boolean;
    crumb?: boolean;
    children?: ReactNode;
}) {
    return (
        <header className="flex h-16 flex-none items-center gap-1 border-b border-[var(--yona-chat-line)] bg-[var(--yona-chat-panel)] ps-2 pe-3">
            {back ? <BackButton /> : <span className="w-3" />}
            {crumb ? (
                <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--yona-chat-ink-soft)]">{title}</span>
            ) : (
                <h1 className="m-0 min-w-0 flex-1 truncate text-[18px] font-semibold leading-6 tracking-[-0.01em] text-[var(--yona-chat-ink)]">{title}</h1>
            )}
            {children}
            <ExpandButton />
            <CloseButton />
        </header>
    );
}
