import { useState } from 'react';
import type { FormEvent } from 'react';
import { router, usePage } from '@inertiajs/react';

import type { SharedPageProps } from '../../../../types';

import { t } from '../../../../i18n';
import AuthShell, { authCard } from 'v3/components/AuthShell';
import FormInput from 'v3/components/Form/Input';
import NextButton from 'dashboard/components-next/button/Button';
import { BrandMark } from '../../../components/BrandMark';
import UsernameField from 'shared/people/UsernameField';
import { useUsernameAvailability } from 'shared/people/useUsernameAvailability';

interface WelcomePageProps extends SharedPageProps {
    name: string;
    suggestedUsername: string;
}

export default function WelcomeIndex() {
    const { name: initialName, suggestedUsername } = usePage<WelcomePageProps>().props;
    const [name, setName] = useState(initialName);
    const [username, setUsername] = useState(suggestedUsername);
    const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
    const [isSaving, setSaving] = useState(false);
    const availability = useUsernameAvailability(username, null);

    const nameMissing = name.trim() === '';
    const canSubmit = !nameMissing && availability.status === 'available' && !isSaving;

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!canSubmit) return;

        setSaving(true);
        router.post(
            '/chat/welcome',
            { name: name.trim(), username },
            {
                onError: errors => setServerErrors(errors),
                onFinish: () => setSaving(false),
            },
        );
    };

    return (
        <AuthShell>
            <div className={authCard}>
                <BrandMark className="h-7" />
                <h1 className="mt-6 text-2xl font-medium text-n-slate-12">{t('PEOPLE.WELCOME.TITLE')}</h1>
                <p className="mt-2 text-sm text-n-slate-11">{t('PEOPLE.WELCOME.SUBTITLE')}</p>
                <form className="mt-6 space-y-4" onSubmit={submit}>
                    <FormInput
                        name="name"
                        label={t('PEOPLE.NAME.LABEL')}
                        value={name}
                        autoComplete="name"
                        maxLength={255}
                        onChange={event => setName(event.target.value)}
                        hasError={nameMissing || Boolean(serverErrors.name)}
                        errorMessage={serverErrors.name ?? t('PEOPLE.NAME.REQUIRED')}
                    />
                    <UsernameField
                        value={username}
                        onChange={value => {
                            setUsername(value);
                            setServerErrors(current => ({ ...current, username: '' }));
                        }}
                        availability={availability.status}
                        serverError={serverErrors.username}
                    />
                    <NextButton
                        lg
                        type="submit"
                        className="!mt-6 w-full font-medium"
                        label={t('PEOPLE.WELCOME.SUBMIT')}
                        disabled={!canSubmit}
                        isLoading={isSaving}
                    />
                </form>
            </div>
        </AuthShell>
    );
}
