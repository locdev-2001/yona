import { useState } from 'react';
import { format, parseISO } from 'date-fns';

import { t } from '../../../i18n';
import Icon from 'dashboard/components-next/icon/Icon';
import NextButton from 'dashboard/components-next/button/Button';
import type { UserSessionRow } from 'dashboard/settings/profile/ActiveSessions';

// Port từ dashboard/components/auth/SessionLimitOverlay.vue.
interface SessionLimitOverlayProps {
    sessions: UserSessionRow[];
    onRevoke: (sessionId: number) => void;
    onRevokeAll: () => void;
    onCancel: () => void;
}

const isUnknown = (value: string | null) => !value || value === 'Unknown' || value === 'Unknown Browser';

function sessionLabel(session: UserSessionRow): string {
    const parts: string[] = [];
    if (!isUnknown(session.browser_name)) parts.push(session.browser_name!);
    if (!isUnknown(session.platform_name)) parts.push(session.platform_name!);
    return parts.join(' on ') || t('SESSION_LIMIT.UNKNOWN_DEVICE');
}

export default function SessionLimitOverlay({
    sessions,
    onRevoke,
    onRevokeAll,
    onCancel,
}: SessionLimitOverlayProps) {
    const [revokingId, setRevokingId] = useState<number | null>(null);
    const [revokingAll, setRevokingAll] = useState(false);

    const sortedSessions = [...sessions].sort(
        (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
    );

    return (
        <div className="w-full max-w-lg mx-auto">
            <div className="bg-white shadow p-11 sm:shadow-lg sm:rounded-lg">
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-semibold text-n-slate-12">{t('SESSION_LIMIT.TITLE')}</h2>
                        <p className="text-sm text-n-slate-11 mt-2">{t('SESSION_LIMIT.DESCRIPTION')}</p>
                    </div>
                    <NextButton
                        type="button"
                        faded
                        sm
                        className="flex-shrink-0 whitespace-nowrap"
                        label={t('SESSION_LIMIT.END_ALL')}
                        isLoading={revokingAll}
                        disabled={revokingId !== null}
                        onClick={() => {
                            setRevokingAll(true);
                            onRevokeAll();
                        }}
                    />
                </div>

                <div className="flex flex-col gap-3 max-h-80 overflow-y-auto">
                    {sortedSessions.map(session => (
                        <div
                            key={session.id}
                            className="flex items-center justify-between gap-4 rounded-xl border border-n-slate-4 bg-n-background px-4 py-3"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <Icon icon="i-lucide-monitor" className="size-4 text-n-slate-10 flex-shrink-0" />
                                <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className="text-sm font-medium text-n-slate-12">
                                        {sessionLabel(session)}
                                    </span>
                                    <span className="text-xs text-n-slate-10">
                                        {session.created_at
                                            ? `${t('SESSION_LIMIT.STARTED')} ${format(parseISO(session.created_at), 'MMMM d, yyyy')}, ${format(parseISO(session.created_at), 'hh:mma')}`
                                            : t('SESSION_LIMIT.STARTED')}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="text-sm font-medium text-n-slate-11 hover:text-n-slate-12 flex-shrink-0 disabled:opacity-50"
                                disabled={revokingId !== null || revokingAll}
                                onClick={() => {
                                    setRevokingId(session.id);
                                    onRevoke(session.id);
                                }}
                            >
                                {t('SESSION_LIMIT.END')}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="text-center pt-4">
                    <NextButton
                        sm
                        slate
                        link
                        type="button"
                        className="w-full hover:!no-underline"
                        label={t('SESSION_LIMIT.CANCEL')}
                        onClick={onCancel}
                    />
                </div>
            </div>
        </div>
    );
}
