import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { usePage } from '@inertiajs/react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { useOptionalConversation } from 'dashboard/conversation/ConversationContext';
import type { DashboardPageProps } from 'dashboard/types';
import { formatInLocale, parseStoredTimestamp } from 'shared/helpers/timeHelper';

import { t } from '../../i18n';
import CallActivityAction from './CallActivityAction';
import { useJoinGroupCall } from './GroupCallButtons';
import { GROUP_CALL_KIND, formatCallDuration } from './callLog';
import type { CallLogData, CallLogView } from './callLog';

// Hộp chi tiết một cuộc gọi mở từ hàng "Xem chi tiết" trên thẻ: ai gọi ai, thoại hay video, các
// mốc giờ, thời lượng, kết quả; phòng thoại và cuộc gọi nhóm thì danh sách người đã vào. Đọc thẳng
// dữ liệu tin cuộc gọi; tin cũ thiếu mốc nào thì hiện gạch ngang.

const PERSON_AVATAR_SIZE = 32;
const ATTENDEE_AVATAR_SIZE = 28;
const TIME_PATTERN = 'h:mm:ss a';
const DATE_PATTERN = 'MMM d, yyyy';
const MISSING_VALUE = '—';

interface Person {
    name: string;
    avatarUrl: string;
    isViewer: boolean;
}

function timeOf(stamp: string | null | undefined): string {
    const date = stamp ? parseStoredTimestamp(stamp) : null;

    return date ? formatInLocale(date, TIME_PATTERN) : MISSING_VALUE;
}

function dateOf(stamp: string | null | undefined): string {
    const date = stamp ? parseStoredTimestamp(stamp) : null;

    return date ? formatInLocale(date, DATE_PATTERN) : MISSING_VALUE;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 min-h-8 py-1.5 border-b border-n-weak last:border-b-0">
            <dt className="flex-shrink-0 text-sm text-n-slate-11">{label}</dt>
            <dd className="min-w-0 text-sm font-medium text-end text-n-slate-12 truncate tabular-nums">{children}</dd>
        </div>
    );
}

function PersonCell({ label, person }: { label: string; person: Person }) {
    return (
        <div className="flex flex-col items-center flex-1 min-w-0 gap-1.5">
            <Avatar name={person.name} src={person.avatarUrl} size={PERSON_AVATAR_SIZE} roundedFull />
            <span className="max-w-full text-sm font-medium text-n-slate-12 truncate">
                {person.isViewer ? t('CALLS.DETAILS.YOU', { name: person.name }) : person.name}
            </span>
            <span className="text-xs text-n-slate-11">{label}</span>
        </div>
    );
}

export default function CallDetailsDialog({ call, view, onClose }: { call: CallLogData; view: CallLogView; onClose: () => void }) {
    const dialogRef = useRef<DialogHandle>(null);
    const { auth } = usePage<DashboardPageProps>().props;
    const conversationContext = useOptionalConversation();
    const conversation = conversationContext?.selectedConversation ?? null;
    const isGroupCall = call.kind === GROUP_CALL_KIND;
    const joinGroupCall = useJoinGroupCall(conversationContext?.accountId ?? 0, isGroupCall ? (conversation?.group ?? null) : null);

    useEffect(() => {
        dialogRef.current?.open();
    }, []);

    const viewer: Person = {
        name: auth.user?.display_name || auth.user?.name || '',
        avatarUrl: auth.user?.avatar_url ?? '',
        isViewer: true,
    };
    const peer: Person = {
        name: conversation?.meta.sender.name ?? '',
        avatarUrl: conversation?.meta.sender.thumbnail ?? '',
        isViewer: false,
    };
    const isOutbound = call.direction === 'outbound';
    const attendees = call.attendees ?? [];
    // Phòng thoại không đổ chuông: mốc đầu là lúc mở phòng; gọi 1-1 và gọi nhóm là lúc đổ chuông.
    const isRoom = view.isGroup && !isGroupCall;
    const firstStamp = isRoom ? call.started_at : call.rang_at;
    const callBack = isGroupCall ? (
        joinGroupCall ? (
            <Button type="button" faded slate icon={view.icon} label={t('CALLS.DIRECT.CALL_BACK')} className="w-full" onClick={() => joinGroupCall(view.media)} />
        ) : null
    ) : (
        <CallActivityAction call={call} size="md" className="w-full" />
    );
    const duration = call.duration_seconds == null ? MISSING_VALUE : formatCallDuration(call.duration_seconds);

    return (
        <Dialog
            ref={dialogRef}
            width="sm"
            title={view.title}
            showCancelButton={false}
            showConfirmButton={false}
            onClose={onClose}
            footer={
                <div className={`grid gap-3 w-full ${isRoom ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    <Button type="button" faded slate label={t('CALLS.DETAILS.CLOSE')} className="w-full" onClick={() => dialogRef.current?.close()} />
                    {isRoom ? null : (
                        // Gọi lại mở màn gọi; hộp đóng sau cú bấm để không che màn gọi.
                        <span className="flex min-w-0" onClick={() => dialogRef.current?.close()}>
                            {callBack}
                        </span>
                    )}
                </div>
            }
        >
            <div className="flex flex-col gap-4" data-call-details>
                {view.isGroup ? null : (
                    <div className="flex items-start gap-2">
                        <PersonCell label={t('CALLS.DETAILS.CALLER')} person={isOutbound ? viewer : peer} />
                        <span className="flex items-center justify-center flex-shrink-0 size-8 text-n-slate-10">
                            <span className="i-lucide-arrow-right size-4" />
                        </span>
                        <PersonCell label={t('CALLS.DETAILS.CALLEE')} person={isOutbound ? peer : viewer} />
                    </div>
                )}
                <dl className="flex flex-col">
                    {view.isGroup ? <DetailRow label={t('CALLS.DETAILS.GROUP')}>{conversation?.group?.name ?? MISSING_VALUE}</DetailRow> : null}
                    {isGroupCall && call.actor ? <DetailRow label={t('CALLS.DETAILS.CALLER')}>{call.actor.name}</DetailRow> : null}
                    {isRoom ? null : (
                        <DetailRow label={t('CALLS.DETAILS.TYPE')}>{t(view.media === 'video' ? 'CALLS.LOG.VIDEO' : 'CALLS.LOG.VOICE')}</DetailRow>
                    )}
                    <DetailRow label={t('CALLS.DETAILS.DATE')}>{dateOf(firstStamp ?? call.ended_at)}</DetailRow>
                    {isRoom ? (
                        <DetailRow label={t('CALLS.DETAILS.OPENED_AT')}>{timeOf(call.started_at)}</DetailRow>
                    ) : (
                        <>
                            <DetailRow label={t('CALLS.DETAILS.RANG_AT')}>{timeOf(call.rang_at)}</DetailRow>
                            <DetailRow label={t('CALLS.DETAILS.ANSWERED_AT')}>{timeOf(call.answered_at)}</DetailRow>
                        </>
                    )}
                    <DetailRow label={t('CALLS.DETAILS.ENDED_AT')}>{timeOf(call.ended_at)}</DetailRow>
                    <DetailRow label={t('CALLS.DETAILS.DURATION')}>{duration}</DetailRow>
                    <DetailRow label={t('CALLS.DETAILS.RESULT')}>{view.pill}</DetailRow>
                </dl>
                {view.isGroup ? (
                    <div className="flex flex-col gap-2">
                        <h4 className="text-sm font-medium text-n-slate-12">
                            {t('CALLS.DETAILS.PARTICIPANTS', { count: call.participants ?? attendees.length })}
                        </h4>
                        {attendees.length > 0 ? (
                            <ul className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                                {attendees.map(attendee => (
                                    <li key={attendee.user_id} className="flex items-center gap-2.5 min-w-0">
                                        <Avatar name={attendee.name} src={attendee.avatar_url ?? ''} size={ATTENDEE_AVATAR_SIZE} roundedFull />
                                        <span className="text-sm text-n-slate-12 truncate">{attendee.name}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mb-0 text-sm text-n-slate-11">{t('CALLS.DETAILS.NO_PARTICIPANT_LIST')}</p>
                        )}
                    </div>
                ) : null}
            </div>
        </Dialog>
    );
}
