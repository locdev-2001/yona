import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import WootInput from 'dashboard/components/widgets/forms/Input';
import NextButton from 'dashboard/components-next/button/Button';

// Port từ dashboard/routes/dashboard/settings/profile/UserBasicDetails.vue
// (vuelidate → validate tay cùng rule: name required, email required + format).
const INPUT_STYLES: CSSProperties = {
    borderRadius: '0.75rem',
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem',
    marginBottom: '0.125rem',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface UserBasicDetailsProps {
    name: string;
    displayName: string;
    email: string;
    emailEnabled?: boolean;
    onUpdateUser: (payload: { name: string; displayName: string; email: string }) => void;
}

export default function UserBasicDetails({
    name,
    displayName,
    email,
    emailEnabled = false,
    onUpdateUser,
}: UserBasicDetailsProps) {
    const [userName, setUserName] = useState(name);
    const [userDisplayName, setUserDisplayName] = useState(displayName);
    const [userEmail, setUserEmail] = useState(email);
    const [nameTouched, setNameTouched] = useState(false);
    const [emailTouched, setEmailTouched] = useState(false);

    useEffect(() => setUserName(name), [name]);
    useEffect(() => setUserDisplayName(displayName), [displayName]);
    useEffect(() => setUserEmail(email), [email]);

    const nameInvalid = userName.trim().length < 1;
    const emailInvalid = !userEmail || !EMAIL_PATTERN.test(userEmail);

    const updateUser = () => {
        setNameTouched(true);
        setEmailTouched(true);
        if (nameInvalid || (emailEnabled && emailInvalid)) {
            useAlert(t('PROFILE_SETTINGS.FORM.ERROR'));
            return;
        }
        onUpdateUser({ name: userName, displayName: userDisplayName, email: userEmail });
    };

    return (
        <form
            className="flex flex-col gap-4"
            onSubmit={event => {
                event.preventDefault();
                updateUser();
            }}
        >
            <WootInput
                value={userName}
                styles={INPUT_STYLES}
                className={nameTouched && nameInvalid ? 'error' : ''}
                label={t('PROFILE_SETTINGS.FORM.NAME.LABEL')}
                placeholder={t('PROFILE_SETTINGS.FORM.NAME.PLACEHOLDER')}
                error={nameTouched && nameInvalid ? t('PROFILE_SETTINGS.FORM.NAME.ERROR') : ''}
                onChange={value => {
                    setUserName(value);
                    setNameTouched(true);
                }}
                onBlur={() => setNameTouched(true)}
            />
            <WootInput
                value={userDisplayName}
                styles={INPUT_STYLES}
                label={t('PROFILE_SETTINGS.FORM.DISPLAY_NAME.LABEL')}
                placeholder={t('PROFILE_SETTINGS.FORM.DISPLAY_NAME.PLACEHOLDER')}
                onChange={setUserDisplayName}
            />
            {emailEnabled ? (
                <WootInput
                    value={userEmail}
                    styles={INPUT_STYLES}
                    className={emailTouched && emailInvalid ? 'error' : ''}
                    label={t('PROFILE_SETTINGS.FORM.EMAIL.LABEL')}
                    placeholder={t('PROFILE_SETTINGS.FORM.EMAIL.PLACEHOLDER')}
                    error={emailTouched && emailInvalid ? t('PROFILE_SETTINGS.FORM.EMAIL.ERROR') : ''}
                    onChange={value => {
                        setUserEmail(value);
                        setEmailTouched(true);
                    }}
                    onBlur={() => setEmailTouched(true)}
                />
            ) : null}
            <div>
                <NextButton type="submit" label={t('PROFILE_SETTINGS.BTN_TEXT')} />
            </div>
        </form>
    );
}
