import { useMemo, useRef, useState } from 'react';

import { t } from '../../i18n';
import { resetLayout, saveLayout } from '../dashboard/api';
import { DashboardGrid } from '../dashboard/DashboardGrid';
import { canRender } from '../dashboard/DashboardWidget';
import { hiddenWidgets, hideItem, resizeItem, showItem, visibleItems } from '../dashboard/layout';
import type { DashboardProps, LayoutItem, WidgetMeta, WidgetSize } from '../dashboard/types';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { cn } from '../ui/cn';
import { Icon } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function RangePicker({ ranges, value, onChange }: { ranges: string[]; value: string; onChange: (range: string) => void }) {
    return (
        <div
            role="group"
            aria-label={t('ADMIN_DASHBOARD.RANGE.LABEL')}
            className="inline-flex rounded-md border border-console-border bg-console-card p-0.5 shadow-sm"
        >
            {ranges.map(range => (
                <button
                    key={range}
                    type="button"
                    aria-pressed={range === value}
                    onClick={() => onChange(range)}
                    className={cn(
                        'h-8 rounded px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-console-ring/50',
                        range === value
                            ? 'bg-console-primary text-console-primary-foreground'
                            : 'text-console-muted-foreground hover:text-console-foreground',
                    )}
                >
                    {t(`ADMIN_DASHBOARD.RANGE.PRESETS.${range.toUpperCase()}`)}
                </button>
            ))}
        </div>
    );
}

function HiddenWidgets({ widgets, onShow }: { widgets: WidgetMeta[]; onShow: (widget: WidgetMeta) => void }) {
    return (
        <section aria-labelledby="dashboard-hidden-widgets" className="rounded-xl border border-dashed border-console-border p-4">
            <h2 id="dashboard-hidden-widgets" className="text-sm font-semibold">
                {t('ADMIN_DASHBOARD.EDIT.HIDDEN_TITLE')}
            </h2>
            {widgets.length === 0 ? (
                <p className="mt-2 text-sm text-console-muted-foreground">{t('ADMIN_DASHBOARD.EDIT.HIDDEN_EMPTY')}</p>
            ) : (
                <ul className="mt-3 flex flex-wrap gap-2">
                    {widgets.map(widget => (
                        <li key={widget.key}>
                            <Button variant="outline" size="sm" onClick={() => onShow(widget)} title={widget.description}>
                                <Icon name="i-lucide-plus" />
                                {widget.title}
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
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
        <div className="flex flex-col gap-5">
            <PageHeader
                title={t('ADMIN_DASHBOARD.TITLE')}
                description={t('ADMIN_DASHBOARD.DESCRIPTION')}
                actions={
                    <>
                        <RangePicker ranges={ranges} value={range} onChange={setRange} />
                        {editing ? (
                            <Button variant="outline" onClick={reset}>
                                <Icon name="i-lucide-rotate-ccw" />
                                {t('ADMIN_DASHBOARD.ACTIONS.RESET')}
                            </Button>
                        ) : null}
                        <Button
                            variant={editing ? 'default' : 'outline'}
                            aria-pressed={editing}
                            onClick={() => setEditing(value => !value)}
                        >
                            <Icon name={editing ? 'i-lucide-check' : 'i-lucide-settings-2'} />
                            {editing ? t('ADMIN_DASHBOARD.ACTIONS.DONE') : t('ADMIN_DASHBOARD.ACTIONS.CUSTOMIZE')}
                        </Button>
                    </>
                }
            />

            {editing ? <p className="text-sm text-console-muted-foreground">{t('ADMIN_DASHBOARD.EDIT.HINT')}</p> : null}

            <p aria-live="polite" className={statusText ? 'text-xs text-console-muted-foreground' : 'sr-only'}>
                {statusText}
            </p>
            {saveStatus === 'error' ? <Alert tone="destructive">{t('ADMIN_DASHBOARD.EDIT.SAVE_FAILED')}</Alert> : null}

            {editing ? <HiddenWidgets widgets={hidden} onShow={widget => persist(showItem(layout, widget))} /> : null}

            {layout.length === 0 && !editing ? (
                <Alert>{t('ADMIN_DASHBOARD.EDIT.ALL_HIDDEN')}</Alert>
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
