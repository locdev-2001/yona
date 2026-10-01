import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

import { buttonClassName } from './Button';
import { cn } from './cn';
import { Icon } from './Icon';
import { useConsoleLabels } from './labels';

const SIBLING_COUNT = 1;
const ELLIPSIS = 'ellipsis';

// Trang đầu, trang cuối, trang hiện tại ± SIBLING_COUNT; khoảng hở thay bằng "…".
export function paginationRange(current: number, last: number): (number | typeof ELLIPSIS)[] {
    const pages = new Set([1, last]);
    for (let page = current - SIBLING_COUNT; page <= current + SIBLING_COUNT; page++) {
        if (page >= 1 && page <= last) pages.add(page);
    }

    const sorted = [...pages].sort((left, right) => left - right);

    return sorted.flatMap((page, index) =>
        index > 0 && page - sorted[index - 1] > 1 ? [ELLIPSIS, page] : [page],
    );
}

type PageTarget = { hrefFor: (page: number) => string } | { onPageChange: (page: number) => void };

function PageLink({
    page,
    target,
    active = false,
    disabled = false,
    label,
    children,
}: {
    page: number;
    target: PageTarget;
    active?: boolean;
    disabled?: boolean;
    label?: string;
    children: ReactNode;
}) {
    const className = buttonClassName({
        variant: active ? 'outline' : 'ghost',
        size: 'icon-sm',
        className: cn('min-w-8 w-auto px-2', active && 'font-semibold'),
    });

    if (disabled) {
        return (
            <span aria-disabled="true" aria-label={label} className={className}>
                {children}
            </span>
        );
    }

    if ('hrefFor' in target) {
        return (
            <Link href={target.hrefFor(page)} aria-label={label} aria-current={active ? 'page' : undefined} className={className} preserveScroll>
                {children}
            </Link>
        );
    }

    return (
        <button
            type="button"
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={className}
            onClick={() => target.onPageChange(page)}
        >
            {children}
        </button>
    );
}

export function Pagination({
    current,
    last,
    summary,
    className,
    ...target
}: { current: number; last: number; summary?: ReactNode; className?: string } & PageTarget) {
    const label = useConsoleLabels();

    if (last <= 1) {
        return summary ? <div className={cn('text-sm text-console-muted-foreground', className)}>{summary}</div> : null;
    }

    return (
        <nav
            aria-label={label('pagination')}
            className={cn('flex flex-col items-center justify-between gap-3 sm:flex-row', className)}
        >
            <div className="text-sm text-console-muted-foreground">
                {summary ?? label('page_of', { current, last })}
            </div>
            <div className="flex items-center gap-1">
                <PageLink page={current - 1} target={target} disabled={current <= 1} label={label('previous_page')}>
                    <Icon name="i-lucide-chevron-left" />
                </PageLink>
                {paginationRange(current, last).map((page, index) =>
                    page === ELLIPSIS ? (
                        <span key={`gap-${index}`} className="px-1 text-console-muted-foreground">
                            …
                        </span>
                    ) : (
                        <PageLink key={page} page={page} target={target} active={page === current}>
                            {page}
                        </PageLink>
                    ),
                )}
                <PageLink page={current + 1} target={target} disabled={current >= last} label={label('next_page')}>
                    <Icon name="i-lucide-chevron-right" />
                </PageLink>
            </div>
        </nav>
    );
}
