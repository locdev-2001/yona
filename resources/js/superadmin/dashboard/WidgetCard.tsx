import { WidgetCard as ApprovedWidgetCard } from '../design-preview/widget-card';
import { PreviewButton } from '../design-preview/components';
import { EllipsisVerticalIcon, EyeOffIcon, GripVerticalIcon, RefreshCwIcon } from '@admin/components/icons';
import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from 'react';


import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@admin/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@admin/components/ui/select';
import { cn } from '@admin/lib/utils';

import { t } from '../../i18n';
import { SIZE_CLASS } from './layout';
import type { LayoutItem, WidgetMeta, WidgetSize } from './types';

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
        <PreviewButton
            ref={edit.handleRef}
            appearance="ghost"
            size="icon-sm"
            {...edit.handleProps}
            aria-label={t('ADMIN_DASHBOARD.ACTIONS.DRAG', { title: meta.title })}
            className="dashboard-drag-handle"
        >
            <GripVerticalIcon />
        </PreviewButton>
    );
}

function EditActions({ meta, item, edit }: { meta: WidgetMeta; item: LayoutItem; edit: EditControls }) {
    return (
        <>
            <SizeSelect meta={meta} item={item} edit={edit} />
            <PreviewButton
                appearance="ghost"
                size="icon-sm"
                onClick={edit.onHide}
                aria-label={t('ADMIN_DASHBOARD.ACTIONS.HIDE', { title: meta.title })}
                className="text-muted-foreground"
            >
                <EyeOffIcon />
            </PreviewButton>
        </>
    );
}

// Nút ba chấm ở góc thẻ: làm mới, ẩn ô.
function WidgetMenu({ meta, busy, onRefresh, onHide }: { meta: WidgetMeta; busy: boolean; onRefresh?: () => void; onHide?: () => void }) {
    if (!onRefresh && !onHide) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={<PreviewButton appearance="ghost" size="icon" className="dashboard-widget-menu" />}
                aria-label={t('ADMIN_DASHBOARD.ACTIONS.MENU', { title: meta.title })}
            >
                <EllipsisVerticalIcon className={cn(busy && 'animate-pulse')} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="catalogue-popup">
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
                            <h2 id={headingId} className="min-w-0 flex-1 truncate text-base font-medium">
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
                            <div className="sr-only focus-within:not-sr-only"><PreviewButton
                                appearance="secondary"
                                size="sm"
                                onClick={onRefresh}
                                disabled={busy}
                            >
                                <RefreshCwIcon />
                                {t('ADMIN_DASHBOARD.ACTIONS.REFRESH', { title: meta.title })}
                            </PreviewButton></div>
                        ) : null}
                        {children}
                    </>
                )}
            </section>
        );
    }

    return (
        <section {...sectionProps}>
            <ApprovedWidgetCard title={meta.title} description={meta.description} headingId={headingId} seed={meta.key} className="dashboard-approved-widget" action={<WidgetMenu meta={meta} busy={busy} onRefresh={onRefresh} onHide={onHide} />}>
                {edit && <div className="dashboard-edit-controls"><DragHandle meta={meta} edit={edit} /><EditActions meta={meta} item={item} edit={edit} /></div>}
                {children}
            </ApprovedWidgetCard>
        </section>
    );
}
