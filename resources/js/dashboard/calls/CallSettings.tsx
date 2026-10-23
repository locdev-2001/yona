import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import Button from 'dashboard/components-next/button/Button';
import Switch from 'dashboard/components-next/switch/Switch';
import SelectInput from 'dashboard/components-next/select/Select';
import { t } from '../../i18n';
import { useCallSession } from './callSession';
import { updateCallPreferences, useCallPreferences } from './preferences';
import type { CallDevice, CallDeviceKind } from './types';
import VolumeControl from './VolumeControl';
import { PHONE_TOUCH_SIZE, TOUCH_MIN_HEIGHT } from './touchTarget';

const DEVICE_LABELS: Record<CallDeviceKind, string> = {
    audioinput: 'CALLS.ROOM.CHOOSE_MICROPHONE',
    videoinput: 'CALLS.ROOM.CHOOSE_CAMERA',
    audiooutput: 'CALLS.QUALITY.OUTPUT_DEVICE',
};

function DeviceSelect({ kind }: { kind: CallDeviceKind }) {
    const session = useCallSession();
    const [devices, setDevices] = useState<CallDevice[]>([]);
    const [error, setError] = useState(false);
    const [isSelecting, setSelecting] = useState(false);
    useEffect(() => {
        let cancelled = false;
        session.actions
            .listDevices(kind)
            .then((found) => {
                if (!cancelled) setDevices(found);
            })
            .catch(() => {
                if (!cancelled) setError(true);
            });
        return () => {
            cancelled = true;
        };
    }, [kind, session.actions.listDevices]);
    return (
        <label className="flex flex-col gap-2 text-sm text-n-slate-12">
            <span>{t(DEVICE_LABELS[kind])}</span>
            <SelectInput
                disabled={isSelecting}
                aria-label={t(DEVICE_LABELS[kind])}
                value={devices.find((device) => device.isActive)?.id ?? ''}
                className="!w-full [&_select]:w-full [&_select]:min-h-[44px]"
                options={devices.length ? devices.map((device, index) => ({
                    value: device.id,
                    label: device.label || t('CALLS.QUALITY.DEVICE_N', { n: index + 1 }),
                })) : [{ value: '', label: t(error ? 'CALLS.ROOM.DEVICE_BLOCKED' : 'CALLS.ROOM.NO_DEVICES') }]}
                onChange={async (id) => {
                    setSelecting(true);
                    setError(false);
                    try {
                        await session.actions.selectDevice(kind, id);
                        setDevices(await session.actions.listDevices(kind));
                    } catch {
                        setError(true);
                    } finally {
                        setSelecting(false);
                    }
                }}
            />
            {error ? (
                <span role="alert" className="text-xs text-n-ruby-11">
                    {t('CALLS.ROOM.DEVICE_BLOCKED')}
                </span>
            ) : null}
        </label>
    );
}

export default function CallSettings({ trigger }: { trigger?: (open: () => void) => ReactNode }) {
    const dialog = useRef<DialogHandle>(null);
    const [isOpen, setOpen] = useState(false);
    const preferences = useCallPreferences();
    const { local } = useCallSession();
    const open = () => {
        setOpen(true);
        dialog.current?.open();
    };
    return (
        <>
            {trigger ? (
                trigger(open)
            ) : (
                <Button sm slate ghost icon="i-lucide-settings-2" title={t('CALLS.QUALITY.SETTINGS')} className={PHONE_TOUCH_SIZE} onClick={open} />
            )}
            <Dialog
                ref={dialog}
                title={t('CALLS.QUALITY.SETTINGS')}
                width="sm"
                overflowYAuto
                showConfirmButton={false}
                cancelButtonLabel={t('CALLS.DETAILS.CLOSE')}
                onClose={() => setOpen(false)}
            >
                {isOpen ? (
                    <div className="flex flex-col gap-4">
                        <DeviceSelect kind="audioinput" />
                        {local.canUseCamera ? <DeviceSelect kind="videoinput" /> : null}
                        {local.canSelectAudioOutput ? (
                            <DeviceSelect kind="audiooutput" />
                        ) : (
                            <p className="m-0 text-sm text-n-slate-11">{t('CALLS.QUALITY.SYSTEM_OUTPUT')}</p>
                        )}
                        <VolumeControl
                            label={t('CALLS.QUALITY.OUTPUT_VOLUME')}
                            maximum={1}
                            value={preferences.outputVolume}
                            onChange={(outputVolume) => updateCallPreferences({ outputVolume })}
                        />
                        <div>
                            <Switch
                                className={TOUCH_MIN_HEIGHT}
                                label={t('CALLS.QUALITY.NOISE_SUPPRESSION')}
                                value={preferences.noiseSuppression}
                                onChange={(noiseSuppression) => updateCallPreferences({ noiseSuppression })}
                            />
                            <p role="status" className="m-0 text-xs text-n-slate-11">
                                {t(
                                    local.filterState === 'enhanced'
                                        ? 'CALLS.QUALITY.FILTER_ENHANCED'
                                        : local.filterState === 'off'
                                          ? 'CALLS.QUALITY.FILTER_OFF'
                                          : 'CALLS.QUALITY.FILTER_BROWSER',
                                )}
                            </p>
                        </div>
                        <Switch
                            className={TOUCH_MIN_HEIGHT}
                            label={t('CALLS.QUALITY.SHOW_STATISTICS')}
                            value={preferences.showStatistics}
                            onChange={(showStatistics) => updateCallPreferences({ showStatistics })}
                        />
                    </div>
                ) : null}
            </Dialog>
        </>
    );
}
