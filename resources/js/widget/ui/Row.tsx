import type { ReactNode } from 'react';

/** Một dòng bấm được trong danh sách (bài viết, liên kết, kênh khác). Cao ≥ 44px. */
export default function Row({
    children,
    trailing = <span className="i-lucide-chevron-right size-4 text-[var(--yona-chat-ink-muted)]" />,
    onClick,
    href,
    divider = true,
    muted = false,
}: {
    children: ReactNode;
    trailing?: ReactNode;
    onClick?: () => void;
    href?: string;
    divider?: boolean;
    muted?: boolean;
}) {
    const className = `flex min-h-11 w-full items-center gap-3 py-2 text-start text-[14px] no-underline ${
        divider ? 'border-t border-[var(--yona-chat-line)] first:border-t-0' : ''
    } ${muted ? 'text-[var(--yona-chat-ink-soft)]' : 'text-[var(--yona-chat-ink)]'}`;

    if (href) {
        return (
            <a className={className} href={href} target="_blank" rel="noopener noreferrer">
                {children}
                {trailing}
            </a>
        );
    }

    return (
        <button type="button" className={className} onClick={onClick} disabled={!onClick}>
            {children}
            {trailing}
        </button>
    );
}
