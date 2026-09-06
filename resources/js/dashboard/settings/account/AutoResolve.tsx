import { useEffect, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { getJson, patchJson } from 'dashboard/helper/apiClient';
import Button from 'dashboard/components-next/button/Button';
import DurationInput from 'dashboard/components-next/input/DurationInput';
import Editor from 'dashboard/components-next/Editor/Editor';
import SingleSelect from 'dashboard/components-next/filter/inputs/SingleSelect';
import Switch from 'dashboard/components-next/switch/Switch';
import WithLabel from 'v3/components/Form/WithLabel';
import { DURATION_UNITS } from 'dashboard/components-next/input/constants';
import type { DurationUnit } from 'dashboard/components-next/input/constants';
import type { FilterOption } from 'dashboard/components-next/filter/helper/filterHelper';
import type { UISettings } from 'dashboard/composables/useUISettings';
import type { DashboardPageProps } from '../../types';
import type { Label } from '../labels/types';

// Port từ settings/account/components/AutoResolve.vue.

const MINIMUM_DURATION_MINUTES = 10;

// 999 ngày — trần mà bản gốc đặt trên DurationInput.
const MAXIMUM_DURATION_MINUTES = 1438560;

interface AccountSettings extends Record<string, unknown> {
    auto_resolve_after?: number | null;
    auto_resolve_message?: string | null;
    auto_resolve_ignore_waiting?: boolean | null;
    auto_resolve_label?: string | null;
}

const unitFor = (minutes: number): DurationUnit => {
    if (minutes % (24 * 60) === 0) return DURATION_UNITS.DAYS;
    if (minutes % 60 === 0) return DURATION_UNITS.HOURS;

    return DURATION_UNITS.MINUTES;
};

interface AutoResolveProps {
    uiSettings: UISettings;
}

export default function AutoResolve({ uiSettings }: AutoResolveProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [duration, setDuration] = useState<number | null>(null);
    const [unit, setUnit] = useState<DurationUnit>(DURATION_UNITS.MINUTES);
    const [message, setMessage] = useState('');
    const [ignoreWaiting, setIgnoreWaiting] = useState(false);
    const [labelToApply, setLabelToApply] = useState<FilterOption | null>(null);
    const [isEnabled, setEnabled] = useState(false);
    const [isSubmitting, setSubmitting] = useState(false);
    const [labels, setLabels] = useState<Label[]>([]);

    const labelOptions: FilterOption[] = useMemo(
        () =>
            labels.map(label => ({
                id: label.title,
                name: label.title,
                icon: (
                    <span
                        className="size-[12px] ring-1 ring-n-alpha-1 dark:ring-white/20 ring-inset rounded-sm"
                        style={{ backgroundColor: label.color }}
                    />
                ),
            })),
        [labels],
    );

    useEffect(() => {
        let active = true;

        Promise.all([
            getJson<{ settings?: AccountSettings }>(`/api/v1/accounts/${accountId}`),
            getJson<{ payload: Label[] }>(`/api/v1/accounts/${accountId}/labels`),
        ]).then(([account, labelResponse]) => {
            if (!active) return;

            const settings = account.settings ?? {};

            setDuration(settings.auto_resolve_after ?? null);
            setMessage(settings.auto_resolve_message ?? '');
            setIgnoreWaiting(Boolean(settings.auto_resolve_ignore_waiting));
            setLabels(labelResponse.payload);
            setLabelToApply(
                labelResponse.payload.some(label => label.title === settings.auto_resolve_label)
                    ? { id: settings.auto_resolve_label!, name: settings.auto_resolve_label! }
                    : null,
            );

            if (settings.auto_resolve_after) {
                setUnit(unitFor(settings.auto_resolve_after));
                setEnabled(true);
            }
        });

        return () => {
            active = false;
        };
    }, [accountId]);

    const updateAccountSettings = async (settings: AccountSettings) => {
        setSubmitting(true);

        try {
            await patchJson(`/api/v1/accounts/${accountId}`, settings);
            useAlert(t('GENERAL_SETTINGS.FORM.AUTO_RESOLVE.DURATION.API.SUCCESS'));
        } catch {
            useAlert(t('GENERAL_SETTINGS.FORM.AUTO_RESOLVE.DURATION.API.ERROR'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        if ((duration ?? 0) < MINIMUM_DURATION_MINUTES) {
            useAlert(t('GENERAL_SETTINGS.FORM.AUTO_RESOLVE.DURATION.ERROR'));

            return;
        }

        void updateAccountSettings({
            auto_resolve_after: duration,
            auto_resolve_message: message,
            auto_resolve_ignore_waiting: ignoreWaiting,
            auto_resolve_label: (labelToApply?.name as string) ?? null,
        });
    };

    // Tắt công tắc = xóa sạch cấu hình ngay, không chờ bấm lưu (bản gốc).
    const toggleAutoResolve = (enabled: boolean) => {
        setEnabled(enabled);

        if (enabled) return;

        setDuration(null);
        setMessage('');

        void updateAccountSettings({
            auto_resolve_after: null,
            auto_resolve_message: '',
            auto_resolve_ignore_waiting: false,
            auto_resolve_label: null,
        });
    };

    return (
        <div className="flex flex-col w-full outline-1 outline outline-n-container rounded-xl bg-n-solid-2 divide-y divide-n-weak">
            <div className="flex flex-col gap-2 items-start px-5 py-4">
                <div className="flex justify-between items-center w-full">
                    <h3 className="text-heading-2 text-n-slate-12">
                        {t('GENERAL_SETTINGS.FORM.AUTO_RESOLVE.TITLE')}
                    </h3>
                    <div className="flex justify-end">
                        <Switch value={isEnabled} onChange={toggleAutoResolve} />
                    </div>
                </div>
                <p className="mb-0 text-body-para text-n-slate-11">
                    {t('GENERAL_SETTINGS.FORM.AUTO_RESOLVE.NOTE')}
                </p>
            </div>

            {isEnabled ? (
                <div className="px-5 py-4">
                    <form className="grid gap-5" onSubmit={handleSubmit}>
                        <WithLabel
                            name="auto-resolve-duration"
                            label={t('GENERAL_SETTINGS.FORM.AUTO_RESOLVE.DURATION.LABEL')}
                            helpMessage={t('GENERAL_SETTINGS.FORM.AUTO_RESOLVE.DURATION.HELP')}
                        >
                            <div className="gap-2 w-full grid grid-cols-[3fr_1fr]">
                                <DurationInput
                                    value={duration}
                                    unit={unit}
                                    min={0}
                                    max={MAXIMUM_DURATION_MINUTES}
                                    className="w-full"
                                    onChange={setDuration}
                                    onUnitChange={setUnit}
                                />
                            </div>
                        </WithLabel>
                        <WithLabel
                            name="auto-resolve-message"
                            label={t('GENERAL_SETTINGS.FORM.AUTO_RESOLVE.MESSAGE.LABEL')}
                            helpMessage={t('GENERAL_SETTINGS.FORM.AUTO_RESOLVE.MESSAGE.HELP')}
                        >
                            <Editor
                                value={message}
                                uiSettings={uiSettings}
                                className="w-full"
                                channelType="Context::NoToolbar"
                                enableCannedResponses={false}
                                showCharacterCount={false}
                                placeholder={t('GENERAL_SETTINGS.FORM.AUTO_RESOLVE.MESSAGE.PLACEHOLDER')}
                                onChange={setMessage}
                            />
                        </WithLabel>
                        <WithLabel
                            name="auto-resolve-preferences"
                            label={t('GENERAL_SETTINGS.FORM.AUTO_RESOLVE.PREFERENCES')}
                        >
                            <div className="rounded-xl border border-n-weak bg-n-solid-1 w-full text-sm text-n-slate-12 divide-y divide-n-weak">
                                <div className="p-3 h-12 flex items-center justify-between">
                                    <span>{t('GENERAL_SETTINGS.FORM.AUTO_RESOLVE.IGNORE_WAITING.LABEL')}</span>
                                    <Switch value={ignoreWaiting} onChange={setIgnoreWaiting} />
                                </div>
                                <div className="p-3 h-12 flex items-center justify-between">
                                    <span>{t('GENERAL_SETTINGS.FORM.AUTO_RESOLVE.LABEL.LABEL')}</span>
                                    <SingleSelect
                                        value={labelToApply}
                                        options={labelOptions}
                                        placeholder={t('GENERAL_SETTINGS.FORM.AUTO_RESOLVE.LABEL.PLACEHOLDER')}
                                        placeholderIcon="i-lucide-chevron-down"
                                        placeholderTrailingIcon
                                        onChange={setLabelToApply}
                                    />
                                </div>
                            </div>
                        </WithLabel>
                        <div className="flex gap-2">
                            <Button
                                blue
                                type="submit"
                                isLoading={isSubmitting}
                                label={t('GENERAL_SETTINGS.FORM.AUTO_RESOLVE.UPDATE_BUTTON')}
                            />
                        </div>
                    </form>
                </div>
            ) : null}
        </div>
    );
}
