import Button from 'dashboard/components-next/button/Button';
import ButtonGroup from 'dashboard/components-next/buttonGroup/ButtonGroup';
import { t } from '../../i18n';
import DevicePicker from './DevicePicker';
import type { CallActions, CallDeviceKind, CallLocalState } from './types';

type Tone = 'neutral' | 'off' | 'active';

const TONE_PROPS: Record<Tone, Record<string, boolean>> = {
    neutral: { slate: true, faded: true },
    off: { ruby: true, faded: true },
    active: { teal: true, solid: true },
};

// Nút kèm mũi tên chọn thiết bị, ghép liền thành một khối.
function DeviceToggle({
    icon,
    title,
    tone,
    onToggle,
    chevronTitle,
    deviceKind,
    actions,
}: {
    icon: string;
    title: string;
    tone: Tone;
    onToggle: () => void;
    chevronTitle?: string;
    deviceKind?: CallDeviceKind;
    actions?: CallActions;
}) {
    const toneProps = TONE_PROPS[tone];
    const mainButton = (
        <Button sm {...toneProps} icon={icon} title={title} className={`!h-9 !w-10 !px-0 ${deviceKind ? '!rounded-e-none' : ''}`} onClick={onToggle} />
    );

    if (!deviceKind || !actions) return mainButton;

    return (
        <ButtonGroup className="flex gap-px">
            {mainButton}
            <DevicePicker kind={deviceKind} listDevices={actions.listDevices} onSelect={actions.selectDevice}>
                {toggle => (
                    <Button sm {...toneProps} icon="i-lucide-chevron-down" title={chevronTitle} className="!h-9 !w-6 !px-0 !rounded-s-none" onClick={toggle} />
                )}
            </DevicePicker>
        </ButtonGroup>
    );
}

// Hàng nút của màn phòng: mic, camera khi phòng cho phép (kèm chọn thiết bị), chia sẻ màn hình, rời phòng.
export default function CallControls({ local, actions, isPhone }: { local: CallLocalState; actions: CallActions; isPhone: boolean }) {
    return (
        <div className="flex items-center gap-2">
            <DeviceToggle
                icon={local.micOn ? 'i-lucide-mic' : 'i-lucide-mic-off'}
                title={local.micOn ? t('CALLS.ROOM.MIC_ON') : t('CALLS.ROOM.MIC_OFF')}
                tone={local.micOn ? 'neutral' : 'off'}
                onToggle={actions.toggleMic}
                chevronTitle={t('CALLS.ROOM.CHOOSE_MICROPHONE')}
                deviceKind={isPhone ? undefined : 'audioinput'}
                actions={actions}
            />
            {local.canUseCamera ? (
                <DeviceToggle
                    icon={local.camOn ? 'i-lucide-video' : 'i-lucide-video-off'}
                    title={local.camOn ? t('CALLS.ROOM.CAMERA_ON') : t('CALLS.ROOM.CAMERA_OFF')}
                    tone={local.camOn ? 'neutral' : 'off'}
                    onToggle={actions.toggleCamera}
                    chevronTitle={t('CALLS.ROOM.CHOOSE_CAMERA')}
                    deviceKind={isPhone ? undefined : 'videoinput'}
                    actions={actions}
                />
            ) : null}
            {local.canShareScreen ? (
                <DeviceToggle
                    icon="i-lucide-screen-share"
                    title={local.sharingScreen ? t('CALLS.ROOM.SCREEN_STOP') : t('CALLS.ROOM.SCREEN_START')}
                    tone={local.sharingScreen ? 'active' : 'neutral'}
                    onToggle={actions.toggleScreen}
                />
            ) : null}
            <DeviceToggle
                icon={local.deafened ? 'i-lucide-headphone-off' : 'i-lucide-headphones'}
                title={local.deafened ? t('CALLS.ROOM.UNDEAFEN') : t('CALLS.ROOM.DEAFEN')}
                tone={local.deafened ? 'off' : 'neutral'}
                onToggle={actions.toggleDeafen}
            />
            <Button
                sm
                ruby
                solid
                icon="i-lucide-phone-off"
                title={t('CALLS.ROOM.LEAVE')}
                className="!h-9 !w-12 !px-0 ms-2"
                onClick={actions.leave}
            />
        </div>
    );
}
