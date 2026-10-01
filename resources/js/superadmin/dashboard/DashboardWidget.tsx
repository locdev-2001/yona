import { RefreshCwIcon } from 'lucide-react';
import type { CSSProperties, Ref } from 'react';

import { Button } from '@admin/components/ui/button';
import { cn } from '@admin/lib/utils';
import { WidgetEmpty, WidgetError, WidgetSkeleton } from '@admin/views/dashboards/widgets/widget-state';

import { t } from '../../i18n';
import { WidgetCard } from './WidgetCard';
import type { EditControls } from './WidgetCard';
import type { LayoutItem, OperationLink, RangePreset, WidgetMeta } from './types';
import { useWidgetData } from './useWidgetData';
import { OperationLinks } from './widgets/system';
import { SERVER_WIDGETS } from './widgets';
import type { AnyRenderer } from './widgets';

export const OPERATION_LINKS_KEY = 'operation_links';

type Props = {
    ref?: Ref<HTMLElement>;
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

export function DashboardWidget(props: Props) {
    if (props.meta.source === 'server') {
        return <ServerWidget renderer={SERVER_WIDGETS[props.meta.key]} {...props} />;
    }

    return (
        <WidgetCard ref={props.ref} meta={props.meta} item={props.item} edit={props.edit} style={props.style} dragging={props.dragging}>
            <OperationLinks links={props.links} />
        </WidgetCard>
    );
}

function ServerWidget({ ref, meta, item, edit, range, endpoint, renderer, style, dragging }: Props & { renderer: AnyRenderer }) {
    const { state, refresh } = useWidgetData<unknown>(endpoint, meta.key, range);
    const loading = state.status === 'loading';

    const refreshButton = (
        <Button
            variant="ghost"
            size="icon-sm"
            onClick={refresh}
            disabled={loading}
            aria-label={t('ADMIN_DASHBOARD.ACTIONS.REFRESH', { title: meta.title })}
            className="text-muted-foreground"
        >
            <RefreshCwIcon className={cn(loading && 'animate-spin')} />
        </Button>
    );

    let body;
    if (state.data === null) {
        body =
            state.status === 'error' ? (
                <WidgetError title={t('ADMIN_DASHBOARD.STATE.ERROR')} retryLabel={t('ADMIN_DASHBOARD.ACTIONS.RETRY')} onRetry={refresh} />
            ) : (
                <WidgetSkeleton kind={renderer.skeleton} />
            );
    } else if (renderer.isEmpty?.(state.data)) {
        body = <WidgetEmpty title={t('ADMIN_DASHBOARD.STATE.EMPTY')} />;
    } else {
        body = (
            <div className={cn('flex flex-1 flex-col gap-4 transition-opacity', loading && 'opacity-60')}>
                {state.status === 'error' ? <WidgetError title={t('ADMIN_DASHBOARD.STATE.ERROR')} /> : null}
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
}
