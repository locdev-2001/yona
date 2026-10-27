import { t } from '../../../i18n';
import SelectInput from 'dashboard/components-next/select/Select';
import {
    MESSAGE_TOAST_POSITIONS,
    type MessageToastPosition,
} from 'dashboard/notifications/toast/messageToastPosition';
import { PreferenceRow } from './AlertSoundPreferences';

const POSITION_LABEL_KEYS: Record<MessageToastPosition, string> = {
    'top-right': 'PROFILE_SETTINGS.FORM.NOTIFICATIONS.TOAST_POSITION.TOP_RIGHT',
    'bottom-right': 'PROFILE_SETTINGS.FORM.NOTIFICATIONS.TOAST_POSITION.BOTTOM_RIGHT',
    'bottom-left': 'PROFILE_SETTINGS.FORM.NOTIFICATIONS.TOAST_POSITION.BOTTOM_LEFT',
    'top-left': 'PROFILE_SETTINGS.FORM.NOTIFICATIONS.TOAST_POSITION.TOP_LEFT',
};

interface MessageToastPreferencesProps {
    value: MessageToastPosition;
    onChange: (position: MessageToastPosition) => void;
}

/** Góc hiện hộp báo tin mới trong trang — lưu ở ui_settings, áp cho mọi trình duyệt người dùng đăng nhập. */
export default function MessageToastPreferences({ value, onChange }: MessageToastPreferencesProps) {
    return (
        <div id="profile-settings-message-toast" className="panel-surface flex flex-col gap-4 p-4 rounded-xl">
            <PreferenceRow
                label={t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.TOAST_POSITION.TITLE')}
                htmlFor="message-toast-position"
                note={t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.TOAST_POSITION.NOTE')}
            >
                <SelectInput
                    id="message-toast-position"
                    value={value}
                    options={MESSAGE_TOAST_POSITIONS.map(position => ({ value: position, label: t(POSITION_LABEL_KEYS[position]) }))}
                    onChange={position => onChange(position as MessageToastPosition)}
                />
            </PreferenceRow>
        </div>
    );
}
