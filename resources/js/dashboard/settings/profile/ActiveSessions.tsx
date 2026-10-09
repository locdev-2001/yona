import { useEffect, useState } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { deleteJson, getJson } from 'dashboard/helper/apiClient';
import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';

// Port từ settings/profile/ActiveSessions.vue.
export interface UserSessionRow {
    id: number;
    browser_name: string | null;
    browser_version: string | null;
    device_name: string | null;
    platform_name: string | null;
    platform_version: string | null;
    city: string | null;
    country: string | null;
    last_activity_at: string | null;
    created_at: string | null;
    current: boolean;
}

const isUnknown = (value: string | null) => !value || value === 'Unknown' || value === 'Unknown Browser';

export function sessionDeviceIcon(session: Pick<UserSessionRow, 'device_name'>): string {
    const name = (session.device_name || '').toLowerCase();
    if (name.includes('iphone') || name.includes('android') || name.includes('mobile')) {
        return 'i-lucide-smartphone';
    }
    if (name.includes('ipad') || name.includes('tablet')) {
        return 'i-lucide-tablet';
    }
    return 'i-lucide-monitor';
}

function sessionLabel(session: UserSessionRow): string {
    const parts: string[] = [];
    if (!isUnknown(session.browser_name)) {
        parts.push(
            session.browser_version ? `${session.browser_name} ${session.browser_version}` : session.browser_name!,
        );
    }
    if (!isUnknown(session.platform_name)) parts.push(session.platform_name!);
    return parts.join(' on ') || t('PROFILE_SETTINGS.FORM.SESSIONS_SECTION.UNKNOWN_DEVICE');
}

function locationLabel(session: UserSessionRow): string {
    return [session.city, session.country].filter(Boolean).join(', ');
}

export default function ActiveSessions() {
    const [sessions, setSessions] = useState<UserSessionRow[]>([]);

    useEffect(() => {
        getJson<UserSessionRow[]>('/api/v1/profile/sessions')
            .then(setSessions)
            .catch(() => useAlert(t('PROFILE_SETTINGS.FORM.SESSIONS_SECTION.FETCH_ERROR')));
    }, []);

    const revokeSession = async (session: UserSessionRow) => {
        try {
            await deleteJson(`/api/v1/profile/sessions/${session.id}`);
            setSessions(current => current.filter(item => item.id !== session.id));
            useAlert(t('PROFILE_SETTINGS.FORM.SESSIONS_SECTION.REVOKE_SUCCESS'));
        } catch {
            useAlert(t('PROFILE_SETTINGS.FORM.SESSIONS_SECTION.REVOKE_ERROR'));
        }
    };

    return (
        <div className="flex flex-col gap-3">
            {sessions.map(session => (
                <div
                    key={session.id}
                    className="panel-surface flex items-center justify-between gap-4 rounded-xl p-4"
                >
                    <div className="flex items-start gap-3">
                        <Icon
                            icon={sessionDeviceIcon(session)}
                            className="size-5 mt-0.5 text-n-slate-10 flex-shrink-0"
                        />
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className="text-heading-3 text-n-slate-12">{sessionLabel(session)}</span>
                                {session.current ? (
                                    <span className="rounded-full bg-n-teal-3 px-2 py-0.5 text-caption text-n-teal-11">
                                        {t('PROFILE_SETTINGS.FORM.SESSIONS_SECTION.CURRENT')}
                                    </span>
                                ) : null}
                            </div>
                            {locationLabel(session) ? (
                                <span className="text-body-b3 text-n-slate-11">{locationLabel(session)}</span>
                            ) : null}
                            {session.last_activity_at ? (
                                <span className="text-body-b3 text-n-slate-10">
                                    {t('PROFILE_SETTINGS.FORM.SESSIONS_SECTION.LAST_ACTIVE')}{' '}
                                    {formatDistanceToNow(parseISO(session.last_activity_at), { addSuffix: true })}
                                </span>
                            ) : null}
                        </div>
                    </div>
                    {session.current ? null : (
                        <Button
                            type="button"
                            faded
                            xs
                            ruby
                            label={t('PROFILE_SETTINGS.FORM.SESSIONS_SECTION.REVOKE')}
                            onClick={() => void revokeSession(session)}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}
