import { forwardRef } from 'react';
import type { CSSProperties } from 'react';

import { t } from '../../i18n';
import { Button } from '../ui/Button';
import { cn } from '../ui/cn';
import { EmptyState } from '../ui/EmptyState';
import { Icon } from '../ui/Icon';
import { WidgetCard, WidgetSkeleton } from './WidgetCard';
import type { EditControls } from './WidgetCard';
import type { LayoutItem, OperationLink, RangePreset, WidgetMeta } from './types';
import { useWidgetData } from './useWidgetData';
import { OperationLinks } from './widgets/system';
import { SERVER_WIDGETS } from './widgets';
import type { AnyRenderer } from './widgets';

export const OPERATION_LINKS_KEY = 'operation_links';

type Props = {
    meta: WidgetMeta;
    item: LayoutItem;
    edit: EditControls | null;
    range: RangePreset;
    endpoint: string;
    links: OperationLink[];
    style?: CSSProperties;
    dragging?: boolean;
};

export function canRender(meta: WidgetMeta): boolean {
    return meta.source === 'server' ? meta.key in SERVER_WIDGETS : meta.key === OPERATION_LINKS_KEY;
}

export const DashboardWidget = forwardRef<HTMLDivElement, Props>(function DashboardWidget(props, ref) {
    if (props.meta.source === 'server') {
        return <ServerWidget ref={ref} renderer={SERVER_WIDGETS[props.meta.key]} {...props} />;
    }

    return (
        <WidgetCard ref={ref} meta={props.meta} item={props.item} edit={props.edit} style={props.style} dragging={props.dragging}>
            <OperationLinks links={props.links} />
        </WidgetCard>
    );
});

const ServerWidget = forwardRef<HTMLDivElement, Props & { renderer: AnyRenderer }>(function ServerWidget(
    { meta, item, edit, range, endpoint, renderer, style, dragging },
    ref,
) {
    const { state, refresh } = useWidgetData<unknown>(endpoint, meta.key, range);
    const loading = state.status === 'loading';

    const refreshButton = (
        <Button
            variant="ghost"
            size="icon-sm"
            onClick={refresh}
            disabled={loading}
            aria-label={t('ADMIN_DASHBOARD.ACTIONS.REFRESH', { title: meta.title })}
        >
            <Icon name="i-lucide-refresh-cw" className={cn(loading && 'animate-spin')} />
        </Button>
    );

    let body;
    if (state.data === null) {
        body =
            state.status === 'error' ? (
                <EmptyState
                    icon="i-lucide-circle-alert"
                    title={t('ADMIN_DASHBOARD.STATE.ERROR')}
                    className="py-6"
                    action={
                        <Button variant="outline" size="sm" onClick={refresh}>
                            {t('ADMIN_DASHBOARD.ACTIONS.RETRY')}
                        </Button>
                    }
                />
            ) : (
                <WidgetSkeleton kind={renderer.skeleton} />
            );
    } else if (renderer.isEmpty?.(state.data)) {
        body = <EmptyState icon="i-lucide-chart-no-axes-column" title={t('ADMIN_DASHBOARD.STATE.EMPTY')} className="py-6" />;
    } else {
        body = (
            <div className={cn('transition-opacity', loading && 'opacity-60')}>
                {state.status === 'error' ? (
                    <p role="alert" className="mb-3 text-xs text-console-destructive-foreground">
                        {t('ADMIN_DASHBOARD.STATE.ERROR')}
                    </p>
                ) : null}
                {renderer.render(state.data, meta.title)}
            </div>
        );
    }

    return (
        <WidgetCard
            ref={ref}
            meta={meta}
            item={item}
            edit={edit}
            actions={refreshButton}
            busy={loading}
            style={style}
            dragging={dragging}
        >
            {body}
        </WidgetCard>
    );
});
