import type { ReactNode } from 'react';
import { Link } from '@inertiajs/react';

import { t } from '../../../i18n';
import { frontendURL } from 'dashboard/helper/URLHelper';
import { getInboxIconByType } from 'dashboard/helper/inbox';
import { dynamicTime } from 'shared/helpers/timeHelper';
import CardLayout from 'dashboard/components-next/CardLayout';
import Icon from 'dashboard/components-next/icon/Icon';
import AudioChip from 'dashboard/components-next/message/chips/Audio';
import FileChip from 'dashboard/components-next/message/chips/File';
import { ATTACHMENT_TYPES } from 'dashboard/components-next/message/constants';
import type { MessageAttachment } from 'dashboard/components-next/message/helpers/attachments';
import { useInboxLookup } from '../useInboxLookup';

// Port từ dashboard/modules/search/components/SearchResultMessageItem.vue.
// Bỏ khối TranscribedText (lời thoại = EE, payload đính kèm chưa mang).
interface SearchResultMessageItemProps {
    id: number;
    inboxId: number;
    isPrivate?: boolean;
    accountId: number;
    createdAt?: number | null;
    messageId?: number;
    attachments?: MessageAttachment[];
    children?: ReactNode;
}

export default function SearchResultMessageItem({
    id,
    inboxId,
    isPrivate = false,
    accountId,
    createdAt,
    messageId,
    attachments = [],
    children,
}: SearchResultMessageItemProps) {
    const findInbox = useInboxLookup();
    const inbox = findInbox(inboxId);
    const inboxIcon = inbox ? getInboxIconByType(inbox.channel_type, 'fill') : null;
    const createdAtTime = createdAt ? dynamicTime(createdAt) : '';

    const audioAttachments = attachments.filter(attachment => attachment.file_type === ATTACHMENT_TYPES.AUDIO);
    const fileAttachments = attachments.filter(attachment => attachment.file_type !== ATTACHMENT_TYPES.AUDIO);

    const href = frontendURL(
        `accounts/${accountId}/conversations/${id}${messageId ? `?messageId=${messageId}` : ''}`,
    );

    return (
        <Link href={href}>
            <CardLayout
                layout="col"
                className="[&>div]:justify-start [&>div]:gap-2 [&>div]:px-4 [&>div]:py-3 [&>div]:items-start hover:bg-n-slate-2"
            >
                <div className="flex items-center min-w-0 justify-between gap-2 w-full h-7 mb-1">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Icon icon="i-lucide-hash" className="flex-shrink-0 text-n-slate-11 size-4" />
                            <span className="text-n-slate-12 text-sm leading-4">{id}</span>
                        </div>
                        {inbox?.name ? <div className="w-px h-3 bg-n-strong" /> : null}
                        {inbox?.name ? (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                {inboxIcon ? (
                                    <div className="flex items-center justify-center flex-shrink-0 rounded-full bg-n-alpha-2 size-4">
                                        <Icon icon={inboxIcon} className="flex-shrink-0 text-n-slate-11 size-2.5" />
                                    </div>
                                ) : null}
                                <span className="text-sm leading-4 text-n-slate-12">{inbox.name}</span>
                            </div>
                        ) : null}
                        {isPrivate ? <div className="w-px h-3 bg-n-strong" /> : null}
                        {isPrivate ? (
                            <div className="flex items-center text-n-amber-11 gap-1.5 flex-shrink-0">
                                <Icon icon="i-lucide-lock-keyhole" className="flex-shrink-0 size-3.5" />
                                <span className="text-sm leading-4">{t('SEARCH.PRIVATE')}</span>
                            </div>
                        ) : null}
                    </div>
                    {createdAtTime ? (
                        <span className="text-sm font-normal min-w-0 truncate text-n-slate-11">{createdAtTime}</span>
                    ) : null}
                </div>
                {children}
                {audioAttachments.length ? (
                    <div className="mt-1.5 space-y-4 w-full">
                        {audioAttachments.map(attachment => (
                            <div key={attachment.id} className="w-full">
                                <AudioChip
                                    className="bg-n-alpha-2 text-n-slate-12"
                                    attachment={attachment}
                                />
                            </div>
                        ))}
                    </div>
                ) : null}
                {fileAttachments.length ? (
                    <div className="flex gap-2 flex-wrap items-center mt-1.5">
                        {fileAttachments.map(attachment => (
                            <div key={attachment.id} className="[&>*]:!h-8">
                                <FileChip attachment={attachment} />
                            </div>
                        ))}
                    </div>
                ) : null}
            </CardLayout>
        </Link>
    );
}
