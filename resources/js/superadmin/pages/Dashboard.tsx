import { Panel, PreviewButton, SegmentedControl } from '../design-preview/components';
import '../dashboard/design.css';
import { Head } from '@inertiajs/react';
import { CheckIcon, CircleAlertIcon, InfoIcon, PlusIcon, RotateCcwIcon, Settings2Icon } from '@admin/components/icons';
import { useMemo, useRef, useState } from 'react';

import { Alert, AlertTitle } from '@admin/components/ui/alert';

import { t } from '../../i18n';
import { resetLayout, saveLayout } from '../dashboard/api';
import { DashboardGrid } from '../dashboard/DashboardGrid';
import { canRender } from '../dashboard/DashboardWidget';
import { hiddenWidgets, hideItem, resizeItem, showItem, visibleItems } from '../dashboard/layout';
import type { DashboardProps, LayoutItem, WidgetMeta, WidgetSize } from '../dashboard/types';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function RangePicker({ ranges, value, onChange }: { ranges: string[]; value: string; onChange: (range: string) => void }) {
    return <SegmentedControl options={ranges} value={value} onChange={onChange} label={t('ADMIN_DASHBOARD.RANGE.LABEL')} getLabel={range => t(`ADMIN_DASHBOARD.RANGE.PRESETS.${range.toUpperCase()}`)} />;
}

function HiddenWidgets({ widgets, onShow }: { widgets: WidgetMeta[]; onShow: (widget: WidgetMeta) => void }) {
    return (
        <Panel id="dashboard-hidden-widgets" title={t('ADMIN_DASHBOARD.EDIT.HIDDEN_TITLE')} description={widgets.length === 0 ? t('ADMIN_DASHBOARD.EDIT.HIDDEN_EMPTY') : undefined}>
            <div className="toolbar-actions">{widgets.map(widget => <PreviewButton key={widget.key} onClick={() => onShow(widget)} title={widget.description}><PlusIcon />{widget.title}</PreviewButton>)}</div>
        </Panel>
    );
}

export default function SuperAdminDashboard(props: DashboardProps) {
    const { endpoints, ranges, defaultRange, sizes, links } = props;
    const widgets = useMemo(() => props.widgets.filter(canRender), [props.widgets]);
    const widgetsByKey = useMemo(() => Object.fromEntries(widgets.map(widget => [widget.key, widget])), [widgets]);

    const [range, setRange] = useState(defaultRange);
    const [layout, setLayout] = useState<LayoutItem[]>(() => visibleItems(props.layout, widgets));
    const [editing, setEditing] = useState(false);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const saveSequence = useRef(0);

    // Lưu ngay mỗi thay đổi; chỉ kết quả của lần lưu mới nhất được báo trạng thái.
    const persist = (next: LayoutItem[]) => {
        setLayout(next);
        const sequence = ++saveSequence.current;
        setSaveStatus('saving');
        saveLayout(endpoints.layout, next)
            .then(() => sequence === saveSequence.current && setSaveStatus('saved'))
            .catch(() => sequence === saveSequence.current && setSaveStatus('error'));
    };

    const reset = () => {
        const sequence = ++saveSequence.current;
        setSaveStatus('saving');
        resetLayout(endpoints.layout)
            .then(saved => {
                if (sequence !== saveSequence.current) return;
                setLayout(visibleItems(saved, widgets));
                setSaveStatus('saved');
            })
            .catch(() => sequence === saveSequence.current && setSaveStatus('error'));
    };

    const hidden = hiddenWidgets(layout, widgets);
    const statusText =
        saveStatus === 'saving'
            ? t('ADMIN_DASHBOARD.EDIT.SAVING')
            : saveStatus === 'saved' && editing
              ? t('ADMIN_DASHBOARD.EDIT.SAVED')
              : '';

    return (
        <div className="admin-dashboard">
            <Head title={t('ADMIN_DASHBOARD.TITLE')} />
            <header className="page-intro">
                <div><h1>{t('ADMIN_DASHBOARD.TITLE')}</h1><p>{t('ADMIN_DASHBOARD.DESCRIPTION')}</p></div>
                <div className="toolbar-actions">
                    <RangePicker ranges={ranges} value={range} onChange={setRange} />
                    {editing && <PreviewButton onClick={reset}><RotateCcwIcon />{t('ADMIN_DASHBOARD.ACTIONS.RESET')}</PreviewButton>}
                    <PreviewButton appearance={editing ? 'primary' : 'secondary'} aria-pressed={editing} onClick={() => setEditing(value => !value)}>{editing ? <CheckIcon /> : <Settings2Icon />}{t(editing ? 'ADMIN_DASHBOARD.ACTIONS.DONE' : 'ADMIN_DASHBOARD.ACTIONS.CUSTOMIZE')}</PreviewButton>
                </div>
            </header>

            {editing ? (
                <Alert>
                    <InfoIcon aria-hidden="true" />
                    <AlertTitle className="font-normal">{t('ADMIN_DASHBOARD.EDIT.HINT')}</AlertTitle>
                </Alert>
            ) : null}

            <p aria-live="polite" className={statusText ? 'text-muted-foreground -mt-3 text-xs' : 'sr-only'}>
                {statusText}
            </p>
            {saveStatus === 'error' ? (
                <Alert variant="destructive">
                    <CircleAlertIcon aria-hidden="true" />
                    <AlertTitle>{t('ADMIN_DASHBOARD.EDIT.SAVE_FAILED')}</AlertTitle>
                </Alert>
            ) : null}

            {editing ? <HiddenWidgets widgets={hidden} onShow={widget => persist(showItem(layout, widget))} /> : null}

            {layout.length === 0 && !editing ? (
                <Alert>
                    <InfoIcon aria-hidden="true" />
                    <AlertTitle>{t('ADMIN_DASHBOARD.EDIT.ALL_HIDDEN')}</AlertTitle>
                </Alert>
            ) : (
                <DashboardGrid
                    items={layout}
                    widgets={widgetsByKey}
                    editing={editing}
                    sizes={sizes}
                    range={range}
                    endpoint={endpoints.widgets}
                    links={links}
                    onChange={persist}
                    onResize={(key: string, size: WidgetSize) => persist(resizeItem(layout, key, size))}
                    onHide={key => persist(hideItem(layout, key))}
                />
            )}
        </div>
    );
}
