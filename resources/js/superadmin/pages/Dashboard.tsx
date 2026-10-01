import { Head } from '@inertiajs/react';
import { CheckIcon, CircleAlertIcon, InfoIcon, PlusIcon, RotateCcwIcon, Settings2Icon } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { Alert, AlertTitle } from '@admin/components/ui/alert';
import { Button } from '@admin/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@admin/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@admin/components/ui/toggle-group';
import PageHeader from '@admin/views/pages/page-header';

import { t } from '../../i18n';
import { resetLayout, saveLayout } from '../dashboard/api';
import { DashboardGrid } from '../dashboard/DashboardGrid';
import { canRender } from '../dashboard/DashboardWidget';
import { hiddenWidgets, hideItem, resizeItem, showItem, visibleItems } from '../dashboard/layout';
import type { DashboardProps, LayoutItem, WidgetMeta, WidgetSize } from '../dashboard/types';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function RangePicker({ ranges, value, onChange }: { ranges: string[]; value: string; onChange: (range: string) => void }) {
    return (
        <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            value={[value]}
            onValueChange={values => values[0] && onChange(values[0])}
            aria-label={t('ADMIN_DASHBOARD.RANGE.LABEL')}
        >
            {ranges.map(range => (
                <ToggleGroupItem key={range} value={range} className="aria-pressed:bg-primary aria-pressed:text-primary-foreground px-3">
                    {t(`ADMIN_DASHBOARD.RANGE.PRESETS.${range.toUpperCase()}`)}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    );
}

function HiddenWidgets({ widgets, onShow }: { widgets: WidgetMeta[]; onShow: (widget: WidgetMeta) => void }) {
    return (
        <section aria-labelledby="dashboard-hidden-widgets">
            <Card size="sm" className="border-foreground/20 border border-dashed shadow-none ring-0">
                <CardHeader>
                    <CardTitle id="dashboard-hidden-widgets" role="heading" aria-level={2}>
                        {t('ADMIN_DASHBOARD.EDIT.HIDDEN_TITLE')}
                    </CardTitle>
                    {widgets.length === 0 ? <CardDescription>{t('ADMIN_DASHBOARD.EDIT.HIDDEN_EMPTY')}</CardDescription> : null}
                </CardHeader>
                {widgets.length > 0 ? (
                    <CardContent>
                        <ul className="flex flex-wrap gap-2">
                            {widgets.map(widget => (
                                <li key={widget.key}>
                                    <Button variant="outline" size="sm" onClick={() => onShow(widget)} title={widget.description}>
                                        <PlusIcon />
                                        {widget.title}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                ) : null}
            </Card>
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
        <div className="flex flex-col gap-6">
            <Head title={t('ADMIN_DASHBOARD.TITLE')} />
            {/* Cùng khuôn đầu trang với mọi trang console (cỡ tiêu đề, cỡ dòng mô tả). */}
            <PageHeader
                title={t('ADMIN_DASHBOARD.TITLE')}
                description={t('ADMIN_DASHBOARD.DESCRIPTION')}
                className="mb-0 md:mb-0"
                actions={
                    <>
                        <RangePicker ranges={ranges} value={range} onChange={setRange} />
                        {editing ? (
                            <Button variant="outline" onClick={reset}>
                                <RotateCcwIcon />
                                {t('ADMIN_DASHBOARD.ACTIONS.RESET')}
                            </Button>
                        ) : null}
                        <Button variant={editing ? 'default' : 'outline'} aria-pressed={editing} onClick={() => setEditing(value => !value)}>
                            {editing ? <CheckIcon /> : <Settings2Icon />}
                            {editing ? t('ADMIN_DASHBOARD.ACTIONS.DONE') : t('ADMIN_DASHBOARD.ACTIONS.CUSTOMIZE')}
                        </Button>
                    </>
                }
            />

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
