import { forwardRef } from 'react';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

import { t } from '../../i18n';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { cn } from '../ui/cn';
import { Icon } from '../ui/Icon';
import { Skeleton } from '../ui/Skeleton';
import { SIZE_CLASS } from './layout';
import type { LayoutItem, WidgetMeta, WidgetSize } from './types';
import type { SkeletonKind } from './widgets';

export type EditControls = {
    sizes: WidgetSize[];
    onResize: (size: WidgetSize) => void;
    onHide: () => void;
    handleProps: HTMLAttributes<HTMLButtonElement>;
    handleRef: (element: HTMLElement | null) => void;
};

type Props = {
    meta: WidgetMeta;
    item: LayoutItem;
    edit: EditControls | null;
    actions?: ReactNode;
    busy?: boolean;
    children: ReactNode;
    style?: CSSProperties;
    dragging?: boolean;
};

export const WidgetCard = forwardRef<HTMLDivElement, Props>(function WidgetCard(
    { meta, item, edit, actions, busy = false, children, style, dragging = false },
    ref,
) {
    const headingId = `dashboard-widget-${meta.key}`;

    return (
        <section
            ref={ref}
            style={style}
            aria-labelledby={headingId}
            aria-busy={busy || undefined}
            className={cn(SIZE_CLASS[item.size], 'min-w-0', dragging && 'relative z-20')}
        >
            <Card
                className={cn(
                    'h-full gap-4',
                    edit && 'border-dashed',
                    dragging && 'shadow-lg ring-2 ring-console-ring/60',
                )}
            >
                <CardHeader>
                    {edit ? (
                        <button
                            type="button"
                            ref={edit.handleRef}
                            {...edit.handleProps}
                            aria-label={t('ADMIN_DASHBOARD.ACTIONS.DRAG', { title: meta.title })}
                            className="-ml-2 mt-0.5 flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-console-muted-foreground outline-none hover:bg-console-accent focus-visible:ring-2 focus-visible:ring-console-ring/50 active:cursor-grabbing"
                        >
                            <Icon name="i-lucide-grip-vertical" />
                        </button>
                    ) : null}
                    <div className="min-w-0 flex-1">
                        <CardTitle id={headingId} className="truncate">
                            {meta.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 text-xs">{meta.description}</CardDescription>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        {edit ? (
                            <>
                                <select
                                    value={item.size}
                                    onChange={event => edit.onResize(event.target.value as WidgetSize)}
                                    aria-label={t('ADMIN_DASHBOARD.ACTIONS.SIZE', { title: meta.title })}
                                    className="h-8 rounded-md border border-console-border bg-console-card px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-console-ring/50"
                                >
                                    {edit.sizes.map(size => (
                                        <option key={size} value={size}>
                                            {t(`ADMIN_DASHBOARD.SIZES.${size.toUpperCase()}`)}
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={edit.onHide}
                                    aria-label={t('ADMIN_DASHBOARD.ACTIONS.HIDE', { title: meta.title })}
                                >
                                    <Icon name="i-lucide-eye-off" />
                                </Button>
                            </>
                        ) : (
                            actions
                        )}
                    </div>
                </CardHeader>
                <CardContent className="flex-1">{children}</CardContent>
            </Card>
        </section>
    );
});

export function WidgetSkeleton({ kind }: { kind: SkeletonKind }) {
    if (kind === 'stats') {
        return (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 8 }, (_, index) => (
                    <Skeleton key={index} className="h-16" />
                ))}
            </div>
        );
    }

    if (kind === 'chart') {
        return <Skeleton className="h-48 w-full" />;
    }

    return (
        <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-5" style={{ width: `${90 - index * 12}%` }} />
            ))}
        </div>
    );
}
