import { Link } from '@inertiajs/react';

import { frontendURL } from 'dashboard/helper/URLHelper';
import { dynamicTime } from 'shared/helpers/timeHelper';
import MessageFormatter from 'shared/helpers/MessageFormatter';
import CardLayout from 'dashboard/components-next/CardLayout';

// Port từ dashboard/modules/search/components/SearchResultArticleItem.vue.
const MAX_LENGTH = 300;

// ARTICLE_STATUSES của helper/portalHelper.js.
const ARTICLE_STATUSES = { ARCHIVED: 'archived', DRAFT: 'draft', PUBLISHED: 'published' } as const;

interface SearchResultArticleItemProps {
    id: number;
    title: string;
    description?: string | null;
    category?: string | null;
    locale: string;
    content?: string | null;
    portalSlug: string;
    accountId: number;
    status?: string;
    updatedAt?: number;
}

function statusTextColor(status?: string): string {
    if (status === ARTICLE_STATUSES.ARCHIVED) return 'text-n-slate-12';
    if (status === ARTICLE_STATUSES.DRAFT) return 'text-n-amber-11';

    return 'text-n-teal-11';
}

export default function SearchResultArticleItem({
    id,
    title,
    description,
    category,
    locale,
    content,
    portalSlug,
    accountId,
    status,
    updatedAt,
}: SearchResultArticleItemProps) {
    const plainText = content ? new MessageFormatter(content).plainText.trim() : '';
    const truncatedContent = content
        ? plainText.length > MAX_LENGTH
            ? `${plainText.substring(0, MAX_LENGTH)}...`
            : plainText
        : (description ?? '');
    const updatedAtTime = updatedAt ? dynamicTime(updatedAt) : '';

    return (
        <Link href={frontendURL(`accounts/${accountId}/portals/${portalSlug}/${locale}/articles/edit/${id}`)}>
            <CardLayout
                layout="col"
                className="[&>div]:justify-start [&>div]:gap-2 [&>div]:px-4 [&>div]:pt-4 [&>div]:pb-5 [&>div]:items-start hover:bg-n-slate-2 dark:hover:bg-n-solid-3"
            >
                <div className="min-w-0 flex-1 flex flex-col items-start gap-2 w-full">
                    <div className="flex items-center min-w-0 justify-between gap-2 w-full">
                        <div className="flex items-center gap-2">
                            <h5 className="text-sm font-medium leading-4 truncate min-w-0 text-n-slate-12">{title}</h5>
                            {category ? <div className="w-px h-4 bg-n-strong mx-2" /> : null}
                            {category ? (
                                <span className="text-xs inline-flex items-center font-medium rounded-md whitespace-nowrap capitalize bg-n-alpha-2 px-1.5 h-6 text-n-slate-12">
                                    {category}
                                </span>
                            ) : null}
                            {status ? (
                                <span
                                    className={`text-xs inline-flex items-center font-medium rounded-md whitespace-nowrap capitalize bg-n-alpha-2 px-2 h-6 ${statusTextColor(status)}`}
                                >
                                    {status}
                                </span>
                            ) : null}
                        </div>
                        {updatedAtTime ? (
                            <span className="text-sm font-normal min-w-0 truncate text-n-slate-11">
                                {updatedAtTime}
                            </span>
                        ) : null}
                    </div>
                    {truncatedContent ? (
                        <p className="text-sm leading-6 text-n-slate-11 line-clamp-2">{truncatedContent}</p>
                    ) : null}
                </div>
            </CardLayout>
        </Link>
    );
}
