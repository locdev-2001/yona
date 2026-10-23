import { useRef } from 'react';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import Button from 'dashboard/components-next/button/Button';
import { t } from '../../i18n';
import { setParticipantVolume, useCallPreferences } from './preferences';
import VolumeControl from './VolumeControl';
import { PHONE_TOUCH_SIZE } from './touchTarget';

export default function ParticipantVolume({ identity, name }: { identity: string; name: string }) {
    const dialog = useRef<DialogHandle>(null);
    const preferences = useCallPreferences();
    return (
        <>
            <Button
                xs
                slate
                solid
                icon="i-lucide-volume-2"
                title={t('CALLS.QUALITY.PARTICIPANT_VOLUME', { name })}
                className={PHONE_TOUCH_SIZE}
                onClick={() => dialog.current?.open()}
            />
            <Dialog ref={dialog} title={name} width="sm" showConfirmButton={false} cancelButtonLabel={t('CALLS.DETAILS.CLOSE')}>
                <VolumeControl
                    label={t('CALLS.QUALITY.PARTICIPANT_VOLUME', { name })}
                    value={preferences.participantVolumes[identity] ?? 1}
                    onChange={(volume) => setParticipantVolume(identity, volume)}
                />
            </Dialog>
        </>
    );
}
