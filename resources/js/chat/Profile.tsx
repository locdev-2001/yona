import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import { Link, router, usePage } from '@inertiajs/react';

import type { SharedPageProps } from '../types';

import { t } from '../i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import NextButton from 'dashboard/components-next/button/Button';
import Switch from 'dashboard/components-next/switch/Switch';
import { useAlert } from 'dashboard/composables/useAlert';
import { ApiError, putForm, putJson } from 'dashboard/helper/apiClient';
import SnackbarContainer from 'v3/components/SnackBar/Container';
import UsernameField from 'shared/people/UsernameField';
import { useUsernameAvailability } from 'shared/people/useUsernameAvailability';

type GroupAdd = 'everyone' | 'nobody';

interface ProfileData {
    name: string;
    username: string;
    bio: string | null;
    avatar_url: string | null;
    privacy: { group_add: GroupAdd; show_last_seen: boolean };
}

interface ProfilePageProps extends SharedPageProps {
    profile: ProfileData;
}

const BIO_MAX_LENGTH = 160;

export default function ChatProfile() {
    const { profile } = usePage<ProfilePageProps>().props;
    const [savedUsername, setSavedUsername] = useState(profile.username);
    const [form, setForm] = useState({
        name: profile.name,
        username: profile.username,
        bio: profile.bio ?? '',
        groupAdd: profile.privacy.group_add,
        showLastSeen: profile.privacy.show_last_seen,
    });
    const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSaving, setSaving] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);
    const availability = useUsernameAvailability(form.username, savedUsername);

    const usernameOk = availability.status === 'available' || availability.status === 'unchanged';
    const canSave = form.name.trim() !== '' && usernameOk && !isSaving;

    const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
        setForm(current => ({ ...current, [key]: value }));

    const save = async (event: FormEvent) => {
        event.preventDefault();
        if (!canSave) return;

        setSaving(true);
        setErrors({});
        try {
            const saved = await putJson<{ username: string }>('/api/v1/profile', {
                display_name: form.name.trim(),
                username: form.username,
                bio: form.bio.trim() === '' ? null : form.bio.trim(),
                privacy: { group_add: form.groupAdd, show_last_seen: form.showLastSeen },
            });
            setSavedUsername(saved.username);
            useAlert(t('PEOPLE.PROFILE.SAVED'));
        } catch (error) {
            const fieldErrors = error instanceof ApiError ? readFieldErrors(error) : {};
            setErrors(fieldErrors);
            if (Object.keys(fieldErrors).length === 0) useAlert(t('PEOPLE.PROFILE.SAVE_ERROR'));
        } finally {
            setSaving(false);
        }
    };

    const changePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        const payload = new FormData();
        payload.set('avatar', file);
        try {
            const saved = await putForm<{ avatar_url: string }>('/api/v1/profile', payload);
            setAvatarUrl(saved.avatar_url);
            useAlert(t('PEOPLE.PROFILE.PHOTO_SAVED'));
        } catch {
            useAlert(t('PEOPLE.PROFILE.SAVE_ERROR'));
        }
    };

    return (
        <div className="min-h-dvh w-full bg-n-background text-n-slate-12">
            <div className="mx-auto w-full max-w-lg px-4 py-4">
                <Link
                    href="/chat"
                    className="inline-flex min-h-11 items-center gap-2 rounded px-2 text-sm text-n-slate-11 hover:text-n-slate-12 active:scale-[0.97]"
                >
                    <span className="i-lucide-arrow-left size-4" aria-hidden="true" />
                    {t('PEOPLE.PROFILE.BACK')}
                </Link>
                <h1 className="mt-2 text-xl font-medium">{t('PEOPLE.PROFILE.TITLE')}</h1>

                <form className="mt-6 space-y-5" onSubmit={save}>
                    <div className="flex items-center gap-4">
                        <Avatar src={avatarUrl} name={form.name} size={64} roundedFull />
                        <NextButton
                            type="button"
                            slate
                            faded
                            sm
                            label={t('PEOPLE.PROFILE.CHANGE_PHOTO')}
                            className="min-h-11"
                            onClick={() => fileInput.current?.click()}
                        />
                        <input
                            ref={fileInput}
                            type="file"
                            accept="image/png,image/jpeg,image/gif,image/webp"
                            className="hidden"
                            onChange={changePhoto}
                        />
                    </div>

                    <Field label={t('PEOPLE.NAME.LABEL')} htmlFor="profile-name" error={errors.display_name}>
                        <input
                            id="profile-name"
                            value={form.name}
                            maxLength={255}
                            onChange={event => update('name', event.target.value)}
                            className={inputClass}
                        />
                    </Field>

                    <UsernameField
                        value={form.username}
                        onChange={value => {
                            update('username', value);
                            setErrors(current => ({ ...current, username: '' }));
                        }}
                        availability={availability.status}
                        serverError={errors.username}
                    />

                    <Field label={t('PEOPLE.PROFILE.BIO')} htmlFor="profile-bio" error={errors.bio}>
                        <textarea
                            id="profile-bio"
                            value={form.bio}
                            rows={3}
                            maxLength={BIO_MAX_LENGTH}
                            placeholder={t('PEOPLE.PROFILE.BIO_PLACEHOLDER')}
                            onChange={event => update('bio', event.target.value)}
                            className={`${inputClass} resize-none`}
                        />
                    </Field>

                    <fieldset className="border-t border-n-weak pt-4">
                        <legend className="sr-only">{t('PEOPLE.PROFILE.PRIVACY')}</legend>
                        <h2 className="text-base font-medium">{t('PEOPLE.PROFILE.PRIVACY')}</h2>
                        <div className="mt-3">
                            <Field label={t('PEOPLE.PROFILE.GROUP_ADD')} htmlFor="profile-group-add">
                                <select
                                    id="profile-group-add"
                                    value={form.groupAdd}
                                    onChange={event => update('groupAdd', event.target.value as GroupAdd)}
                                    className={`${inputClass} !mb-0 min-h-11 pr-10`}
                                >
                                    <option value="everyone">{t('PEOPLE.PROFILE.GROUP_ADD_EVERYONE')}</option>
                                    <option value="nobody">{t('PEOPLE.PROFILE.GROUP_ADD_NOBODY')}</option>
                                </select>
                            </Field>
                        </div>
                        <Switch
                            value={form.showLastSeen}
                            label={t('PEOPLE.PROFILE.SHOW_LAST_SEEN')}
                            onChange={value => update('showLastSeen', value)}
                        />
                    </fieldset>

                    <NextButton type="submit" lg className="w-full" label={t('PEOPLE.PROFILE.SAVE')} disabled={!canSave} isLoading={isSaving} />
                </form>

                <div className="mt-8 border-t border-n-weak pt-4">
                    <NextButton
                        type="button"
                        slate
                        outline
                        className="min-h-11 w-full"
                        icon="i-lucide-log-out"
                        label={t('PEOPLE.PROFILE.LOGOUT')}
                        onClick={() => router.post('/app/logout')}
                    />
                </div>
            </div>
            <SnackbarContainer />
        </div>
    );
}

const inputClass =
    'block w-full rounded border-none bg-n-alpha-black2 px-3 py-3 text-n-slate-12 outline outline-1 outline-n-weak focus:outline-n-brand sm:text-sm';

function Field({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: ReactNode }) {
    return (
        <div>
            <label htmlFor={htmlFor} className="block text-sm font-medium">
                {label}
            </label>
            <div className="mt-1">{children}</div>
            {error ? <p className="mt-1 text-sm text-n-ruby-11">{error}</p> : null}
        </div>
    );
}

function readFieldErrors(error: ApiError): Record<string, string> {
    return Object.fromEntries(Object.entries(error.body?.errors ?? {}).map(([field, messages]) => [field, messages[0] ?? '']));
}
