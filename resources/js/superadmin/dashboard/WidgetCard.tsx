import { EyeOffIcon, GripVerticalIcon } from 'lucide-react';
import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from 'react';

import { Button } from '@admin/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@admin/components/ui/card';
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
    actions?: ReactNode;
    busy?: boolean;
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

// Khung một ô: thẻ có tiêu đề, mô tả và nút ở góc; chế độ tuỳ chỉnh thêm tay nắm kéo,
// chọn độ rộng và nút ẩn.
export function WidgetCard({ ref, meta, item, edit, actions, busy = false, children, style, dragging = false }: Props) {
    const headingId = `dashboard-widget-${meta.key}`;

    return (
        <section
            ref={ref}
            style={style}
            aria-labelledby={headingId}
            aria-busy={busy || undefined}
            className={cn(SIZE_CLASS[item.size], 'min-w-0', dragging && 'relative z-20')}
        >
            <Card className={cn('h-full', edit && 'border-foreground/20 border border-dashed ring-0', dragging && 'ring-ring shadow-lg ring-2')}>
                <CardHeader>
                    <div className="flex min-w-0 items-center gap-1">
                        {edit ? (
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
                        ) : null}
                        <CardTitle id={headingId} className="truncate text-lg font-semibold">
                            {meta.title}
                        </CardTitle>
                    </div>
                    <CardDescription className="line-clamp-2">{meta.description}</CardDescription>
                    <CardAction className="flex items-center gap-1">
                        {edit ? (
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
                        ) : (
                            actions
                        )}
                    </CardAction>
                </CardHeader>
                <CardContent className="@container flex flex-1 flex-col">{children}</CardContent>
            </Card>
        </section>
    );
}
