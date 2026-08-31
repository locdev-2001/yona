import { useState } from 'react';
import type { CSSProperties } from 'react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage, putJson } from 'dashboard/helper/apiClient';
import WootInput from 'dashboard/components/widgets/forms/Input';
import NextButton from 'dashboard/components-next/button/Button';

// Port từ dashboard/routes/dashboard/settings/profile/ChangePassword.vue
const INPUT_STYLES: CSSProperties = {
    borderRadius: '0.75rem',
    padding: '0.375rem 0.75rem',
    fontSize: '0.875rem',
    marginBottom: '0.125rem',
};

const PASSWORD_MIN_LENGTH = 6;

export default function ChangePassword() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [touched, setTouched] = useState(false);

    const passwordInvalid = password.length > 0 && password.length < PASSWORD_MIN_LENGTH;
    const confirmationInvalid =
        passwordConfirmation !== password ||
        (passwordConfirmation.length > 0 && passwordConfirmation.length < PASSWORD_MIN_LENGTH);
    const isButtonDisabled = !currentPassword || !passwordConfirmation;

    const changePassword = async () => {
        setTouched(true);
        if (!currentPassword || passwordInvalid || confirmationInvalid) {
            useAlert(t('PROFILE_SETTINGS.FORM.ERROR'));
            return;
        }

        let alertMessage = t('PROFILE_SETTINGS.PASSWORD_UPDATE_SUCCESS');
        try {
            await putJson('/api/v1/profile', {
                current_password: currentPassword,
                password,
                password_confirmation: passwordConfirmation,
            });
        } catch (error) {
            alertMessage = parseApiErrorMessage(error) || t('RESET_PASSWORD.API.ERROR_MESSAGE');
        } finally {
            useAlert(alertMessage);
        }
    };

    return (
        <form
            onSubmit={event => {
                event.preventDefault();
                void changePassword();
            }}
        >
            <div className="flex flex-col w-full gap-4">
                <WootInput
                    value={currentPassword}
                    type="password"
                    styles={INPUT_STYLES}
                    className={touched && !currentPassword ? 'error' : ''}
                    label={t('PROFILE_SETTINGS.FORM.CURRENT_PASSWORD.LABEL')}
                    placeholder={t('PROFILE_SETTINGS.FORM.CURRENT_PASSWORD.PLACEHOLDER')}
                    error={touched && !currentPassword ? t('PROFILE_SETTINGS.FORM.CURRENT_PASSWORD.ERROR') : ''}
                    onChange={setCurrentPassword}
                />
                <WootInput
                    value={password}
                    type="password"
                    styles={INPUT_STYLES}
                    className={passwordInvalid ? 'error' : ''}
                    label={t('PROFILE_SETTINGS.FORM.PASSWORD.LABEL')}
                    placeholder={t('PROFILE_SETTINGS.FORM.PASSWORD.PLACEHOLDER')}
                    error={passwordInvalid ? t('PROFILE_SETTINGS.FORM.PASSWORD.ERROR') : ''}
                    onChange={setPassword}
                />
                <WootInput
                    value={passwordConfirmation}
                    type="password"
                    styles={INPUT_STYLES}
                    className={touched && confirmationInvalid ? 'error' : ''}
                    label={t('PROFILE_SETTINGS.FORM.PASSWORD_CONFIRMATION.LABEL')}
                    placeholder={t('PROFILE_SETTINGS.FORM.PASSWORD_CONFIRMATION.PLACEHOLDER')}
                    error={
                        touched && confirmationInvalid ? t('PROFILE_SETTINGS.FORM.PASSWORD_CONFIRMATION.ERROR') : ''
                    }
                    onChange={setPasswordConfirmation}
                />
                <div>
                    <NextButton
                        type="submit"
                        label={t('PROFILE_SETTINGS.FORM.PASSWORD_SECTION.BTN_TEXT')}
                        disabled={isButtonDisabled}
                    />
                </div>
            </div>
        </form>
    );
}
