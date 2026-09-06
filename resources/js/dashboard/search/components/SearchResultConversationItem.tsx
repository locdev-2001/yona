import type { ReactNode } from 'react';
import { Link } from '@inertiajs/react';

import { t } from '../../../i18n';
import { frontendURL } from 'dashboard/helper/URLHelper';
import { getInboxIconByType } from 'dashboard/helper/inbox';
import { dynamicTime } from 'shared/helpers/timeHelper';
import CardLayout from 'dashboard/components-next/CardLayout';
import Icon from 'dashboard/components-next/icon/Icon';
import type { SearchInbox } from '../types';

// Port từ dashboard/modules/search/components/SearchResultConversationItem.vue.
interface SearchResultConversationItemProps {
    id: number;
    inbox?: SearchInbox | Record<string, never>;
    name?: string;
    email?: string | null;
    accountId: number;
    createdAt?: number | null;
    messageId?: number;
    emailSubject?: string;
    children?: ReactNode;
}

export default function SearchResultConversationItem({
    id,
    inbox,
    name = '',
    email = '',
    accountId,
    createdAt,
    messageId,
    emailSubject = '',
    children,
}: SearchResultConversationItemProps) {
    const inboxName = (inbox as SearchInbox)?.name;
    const channelType = (inbox as SearchInbox)?.channelType;
    const inboxIcon = channelType ? getInboxIconByType(channelType, 'fill') : null;
    const createdAtTime = createdAt ? dynamicTime(createdAt) : '';

    const visibleInfoItems = [
        { label: 'SEARCH.FROM', value: name },
        { label: 'SEARCH.EMAIL', value: email },
        { label: 'SEARCH.EMAIL_SUBJECT', value: emailSubject },
    ].filter(item => Boolean(item.value));

    const href = frontendURL(
        `accounts/${accountId}/conversations/${id}${messageId ? `?messageId=${messageId}` : ''}`,
    );

    return (
        <Link href={href}>
            <CardLayout
                layout="col"
                className="[&>div]:justify-start [&>div]:gap-2 [&>div]:px-4 [&>div]:py-3 [&>div]:items-start hover:bg-n-slate-2 dark:hover:bg-n-solid-3"
            >
                <div className="flex items-center min-w-0 justify-between gap-2 w-full h-7 mb-1">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Icon icon="i-lucide-hash" className="flex-shrink-0 text-n-slate-11 size-4" />
                            <span className="text-n-slate-12 text-sm leading-4">{id}</span>
                        </div>
                        {inboxName ? <div className="w-px h-3 bg-n-strong" /> : null}
                        {inboxName ? (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                {inboxIcon ? (
                                    <div className="flex items-center justify-center flex-shrink-0 rounded-full bg-n-alpha-2 size-4">
                                        <Icon icon={inboxIcon} className="flex-shrink-0 text-n-slate-11 size-2.5" />
                                    </div>
                                ) : null}
                                <span className="text-sm leading-4 text-n-slate-12">{inboxName}</span>
                            </div>
                        ) : null}
                    </div>
                    {createdAtTime ? (
                        <span className="text-sm font-normal min-w-0 truncate text-n-slate-11">{createdAtTime}</span>
                    ) : null}
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-1.5 items-center">
                    {visibleInfoItems.map((item, index) => (
                        <div key={item.label} className="contents">
                            <h5 className="m-0 text-sm min-w-0 text-n-slate-12 truncate">
                                <span className="text-sm leading-4 font-normal text-n-slate-11">
                                    {`${t(item.label)}:`}
                                </span>
                                {` ${item.value}`}
                            </h5>
                            {index < visibleInfoItems.length - 1 ? <div className="w-px h-3 bg-n-strong" /> : null}
                        </div>
                    ))}
                </div>
                {children}
            </CardLayout>
        </Link>
    );
}
