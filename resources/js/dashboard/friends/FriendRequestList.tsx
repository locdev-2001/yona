import { useState } from 'react';
import { usePage } from '@inertiajs/react';

import { openProfile } from 'dashboard/contacts/profile/profileOverlay';
import type { ReactNode } from 'react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import { t } from '../../i18n';
import type { DashboardPageProps } from '../types';
import { acceptFriendRequest, ensureYonaContact, removeFriendship } from './api';
import type { FriendRequest, PendingFriendRequests } from './api';

const ACCEPT_CLASS = 'h-8 px-3 rounded-lg text-sm font-semibold bg-n-brand text-white hover:brightness-110 transition disabled:opacity-60';
const SECONDARY_CLASS =
    'h-8 px-3 rounded-lg text-sm font-medium bg-n-alpha-2 text-n-slate-12 hover:bg-n-alpha-3 transition-colors disabled:opacity-60';

interface FriendRequestListProps {
    requests: PendingFriendRequests;
    onChanged: () => void;
}

// Tab "Đang chờ xử lý": lời mời người khác gửi mình (Chấp nhận / Từ chối) và lời mời
// mình đã gửi (Huỷ lời mời).
export default function FriendRequestList({ requests, onChanged }: FriendRequestListProps) {
    if (requests.incoming.length === 0 && requests.outgoing.length === 0) {
        return <p className="py-10 text-sm text-center text-n-slate-11">{t('FRIENDS.REQUESTS.EMPTY')}</p>;
    }

    return (
        <div className="flex flex-col gap-6 pb-6">
            {requests.incoming.length > 0 ? (
                <RequestSection title={t('FRIENDS.REQUESTS.INCOMING', { count: requests.incoming.length })}>
                    {requests.incoming.map(request => (
                        <RequestRow key={request.id} request={request} isIncoming onChanged={onChanged} />
                    ))}
                </RequestSection>
            ) : null}
            {requests.outgoing.length > 0 ? (
                <RequestSection title={t('FRIENDS.REQUESTS.OUTGOING', { count: requests.outgoing.length })}>
                    {requests.outgoing.map(request => (
                        <RequestRow key={request.id} request={request} isIncoming={false} onChanged={onChanged} />
                    ))}
                </RequestSection>
            ) : null}
        </div>
    );
}

function RequestSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section>
            <h2 className="mb-2 text-xs font-semibold text-n-slate-11">{title}</h2>
            <ul className="m-0 p-0 list-none">{children}</ul>
        </section>
    );
}

function RequestRow({ request, isIncoming, onChanged }: { request: FriendRequest; isIncoming: boolean; onChanged: () => void }) {
    const [isBusy, setBusy] = useState(false);
    const accountId = usePage<DashboardPageProps>().props.currentAccount.id;
    const { person } = request;

    const viewProfile = async () => {
        try {
            openProfile(await ensureYonaContact(accountId, person.id));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('FRIENDS.REQUESTS.ERROR'));
        }
    };

    const run = async (action: () => Promise<unknown>, doneKey: string) => {
        setBusy(true);
        try {
            await action();
            useAlert(t(doneKey, { name: person.name }));
            onChanged();
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('FRIENDS.REQUESTS.ERROR'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <li className="flex items-center gap-3 px-2.5 py-2.5 -mx-2.5 rounded-lg border-t border-n-weak first:border-t-transparent hover:bg-n-alpha-1">
            <button type="button" className="flex flex-1 items-center gap-3 min-w-0 text-start" onClick={() => void viewProfile()}>
                <Avatar seed={avatarSeed('user', person.id)} src={person.avatar_url ?? ''} name={person.name} size={32} />
                <span className="flex flex-col flex-1 min-w-0">
                    <span className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-semibold truncate text-n-slate-12">{person.name}</span>
                        <span className="text-xs truncate text-n-slate-10">@{person.username}</span>
                    </span>
                    <span className="text-xs truncate text-n-slate-11">
                        {isIncoming ? t('FRIENDS.REQUESTS.INCOMING_HINT') : t('FRIENDS.REQUESTS.OUTGOING_HINT')}
                    </span>
                </span>
            </button>
            <div className="flex items-center gap-2 shrink-0">
                {isIncoming ? (
                    <>
                        <button
                            type="button"
                            className={ACCEPT_CLASS}
                            disabled={isBusy}
                            onClick={() => void run(() => acceptFriendRequest(request.id), 'FRIENDS.REQUESTS.ACCEPTED')}
                        >
                            {t('FRIENDS.REQUESTS.ACCEPT')}
                        </button>
                        <button
                            type="button"
                            className={SECONDARY_CLASS}
                            disabled={isBusy}
                            onClick={() => void run(() => removeFriendship(request.id), 'FRIENDS.REQUESTS.DECLINED')}
                        >
                            {t('FRIENDS.REQUESTS.DECLINE')}
                        </button>
                    </>
                ) : (
                    <button
                        type="button"
                        className={SECONDARY_CLASS}
                        disabled={isBusy}
                        onClick={() => void run(() => removeFriendship(request.id), 'FRIENDS.REQUESTS.CANCELLED')}
                    >
                        {t('FRIENDS.REQUESTS.CANCEL')}
                    </button>
                )}
            </div>
        </li>
    );
}
