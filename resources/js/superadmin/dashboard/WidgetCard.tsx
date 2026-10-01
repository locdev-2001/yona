import { EllipsisVerticalIcon, EyeOffIcon, GripVerticalIcon, RefreshCwIcon } from 'lucide-react';
import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from 'react';

import { Button } from '@admin/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@admin/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@admin/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@admin/components/ui/select';
import { cn } from '@admin/lib/utils';
import { TONE_CHIP } from '@admin/views/dashboards/tones';

import { t } from '../../i18n';
import { SIZE_CLASS } from './layout';
import type { LayoutItem, WidgetMeta, WidgetSize } from './types';
import { WIDGET_BADGE } from './widgetTones';

export type EditControls = {
    sizes: WidgetSize[];
    onResize: (size: WidgetSize) => void;
    onHide: () => void;
    handleProps: HTMLAttributes<HTMLButtonElement>;
    handleRef: (element: HTMLElement | null) => void;
};

type Props = {
    ref?: Ref<HTMLElement>;
    meta: WidgetMeta;
    item: LayoutItem;
    edit: EditControls | null;
    onRefresh?: () => void;
    onHide?: () => void;
    busy?: boolean;
    // Ô tự vẽ thẻ của mình (hàng thẻ chỉ số): không bọc thêm thẻ ngoài, tiêu đề chỉ để đọc màn hình.
    bare?: boolean;
    children: ReactNode;
    style?: CSSProperties;
    dragging?: boolean;
};

function SizeSelect({ meta, item, edit }: { meta: WidgetMeta; item: LayoutItem; edit: EditControls }) {
    const items = edit.sizes.map(size => ({ value: size, label: t(`ADMIN_DASHBOARD.SIZES.${size.toUpperCase()}`) }));

    return (
        <Select items={items} value={item.size} onValueChange={value => value && edit.onResize(value as WidgetSize)}>
            <SelectTrigger size="sm" className="w-28" aria-label={t('ADMIN_DASHBOARD.ACTIONS.SIZE', { title: meta.title })}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {items.map(size => (
                    <SelectItem key={size.value} value={size.value}>
                        {size.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function DragHandle({ meta, edit }: { meta: WidgetMeta; edit: EditControls }) {
    return (
        <Button
            ref={edit.handleRef}
            variant="ghost"
            size="icon-sm"
            {...edit.handleProps}
            aria-label={t('ADMIN_DASHBOARD.ACTIONS.DRAG', { title: meta.title })}
            className="text-muted-foreground -ml-2 cursor-grab touch-none active:cursor-grabbing"
        >
            <GripVerticalIcon />
        </Button>
    );
}

function EditActions({ meta, item, edit }: { meta: WidgetMeta; item: LayoutItem; edit: EditControls }) {
    return (
        <>
            <SizeSelect meta={meta} item={item} edit={edit} />
            <Button
                variant="ghost"
                size="icon-sm"
                onClick={edit.onHide}
                aria-label={t('ADMIN_DASHBOARD.ACTIONS.HIDE', { title: meta.title })}
                className="text-muted-foreground"
            >
                <EyeOffIcon />
            </Button>
        </>
    );
}

// Nút ba chấm ở góc thẻ: làm mới, ẩn ô.
function WidgetMenu({ meta, busy, onRefresh, onHide }: { meta: WidgetMeta; busy: boolean; onRefresh?: () => void; onHide?: () => void }) {
    if (!onRefresh && !onHide) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon" className="text-muted-foreground size-6 rounded-full" />}
                aria-label={t('ADMIN_DASHBOARD.ACTIONS.MENU', { title: meta.title })}
            >
                <EllipsisVerticalIcon className={cn(busy && 'animate-pulse')} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto">
                <DropdownMenuGroup>
                    {onRefresh ? (
                        <DropdownMenuItem onClick={onRefresh} disabled={busy}>
                            <RefreshCwIcon />
                            {t('ADMIN_DASHBOARD.ACTIONS.REFRESH', { title: meta.title })}
                        </DropdownMenuItem>
                    ) : null}
                    {onHide ? (
                        <DropdownMenuItem onClick={onHide}>
                            <EyeOffIcon />
                            {t('ADMIN_DASHBOARD.ACTIONS.HIDE', { title: meta.title })}
                        </DropdownMenuItem>
                    ) : null}
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// Khung một ô: thẻ có tiêu đề, mô tả và nút ba chấm ở góc; chế độ tuỳ chỉnh thay nút
// góc bằng tay nắm kéo, chọn độ rộng và nút ẩn.
export function WidgetCard({ ref, meta, item, edit, onRefresh, onHide, busy = false, bare = false, children, style, dragging = false }: Props) {
    const headingId = `dashboard-widget-${meta.key}`;
    const badge = WIDGET_BADGE[meta.key];
    const sectionProps = {
        ref,
        style,
        'aria-labelledby': headingId,
        'aria-busy': busy || undefined,
        className: cn(SIZE_CLASS[item.size], 'min-w-0 @container', dragging && 'relative z-20'),
    };

    if (bare) {
        return (
            <section {...sectionProps}>
                {edit ? (
                    <div
                        className={cn(
                            'border-foreground/20 flex flex-col gap-4 rounded-xl border border-dashed p-4',
                            dragging && 'bg-background shadow-lg',
                        )}
                    >
                        <div className="flex items-center gap-1">
                            <DragHandle meta={meta} edit={edit} />
                            <h2 id={headingId} className="min-w-0 flex-1 truncate text-lg font-semibold">
                                {meta.title}
                            </h2>
                            <EditActions meta={meta} item={item} edit={edit} />
                        </div>
                        {children}
                    </div>
                ) : (
                    <>
                        <h2 id={headingId} className="sr-only">
                            {meta.title}
                        </h2>
                        {onRefresh ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onRefresh}
                                disabled={busy}
                                className="sr-only focus-visible:not-sr-only focus-visible:mb-4"
                            >
                                <RefreshCwIcon />
                                {t('ADMIN_DASHBOARD.ACTIONS.REFRESH', { title: meta.title })}
                            </Button>
                        ) : null}
                        {children}
                    </>
                )}
            </section>
        );
    }

    return (
        <section {...sectionProps}>
            <Card className={cn('h-full', edit && 'border-foreground/20 border border-dashed ring-0', dragging && 'shadow-lg')}>
                <CardHeader>
                    <div className="flex min-w-0 items-center gap-1">
                        {edit ? <DragHandle meta={meta} edit={edit} /> : null}
                        {badge ? (
                            <span
                                aria-hidden="true"
                                className={cn('mr-2 flex size-7 shrink-0 items-center justify-center rounded-sm', TONE_CHIP[badge.tone])}
                            >
                                {badge.icon}
                            </span>
                        ) : null}
                        <CardTitle id={headingId} role="heading" aria-level={2} className="min-w-0 text-lg font-semibold break-words">
                            {meta.title}
                        </CardTitle>
                    </div>
                    <CardDescription className="line-clamp-2">{meta.description}</CardDescription>
                    {edit ? (
                        <div className="col-span-full flex items-center justify-between gap-2 pt-2">
                            <EditActions meta={meta} item={item} edit={edit} />
                        </div>
                    ) : (
                        <CardAction>
                            <WidgetMenu meta={meta} busy={busy} onRefresh={onRefresh} onHide={onHide} />
                        </CardAction>
                    )}
                </CardHeader>
                <CardContent className="@container flex flex-1 flex-col">{children}</CardContent>
            </Card>
        </section>
    );
}
