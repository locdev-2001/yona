import { Link } from '@inertiajs/react';

import { t } from '../../../i18n';
import { frontendURL } from 'dashboard/helper/URLHelper';
import { formatBytes } from 'shared/helpers/FileHelper';
import { dynamicTime } from 'shared/helpers/timeHelper';
import Button from 'dashboard/components-next/button/Button';
import CardLayout from 'dashboard/components-next/CardLayout';
import FileIcon from 'dashboard/components-next/icon/FileIcon';
import Icon from 'dashboard/components-next/icon/Icon';
import { fileNameFromUrl } from 'dashboard/conversation/conversationbox/contact/sharedAttachments';
import { searchAuthorName } from '../helpers/searchAuthor';
import { useInboxLookup } from '../useInboxLookup';
import type { SearchFile } from '../types';
import HighlightedText from './HighlightedText';

interface SearchResultFileItemProps {
    file: SearchFile;
    accountId: number;
    query: string;
}

function extensionOf(fileName: string): string {
    const dotIndex = fileName.lastIndexOf('.');

    return dotIndex > 0 ? fileName.slice(dotIndex + 1).toLowerCase() : '';
}

// Cả thẻ là một liên kết mở hội thoại tại đúng tin chứa tệp (liên kết phủ kín thẻ
// bằng lớp ::after); nút mở tệp nằm đè lên trên, không lồng trong liên kết.
export default function SearchResultFileItem({ file, accountId, query }: SearchResultFileItemProps) {
    const findInbox = useInboxLookup();
    const { message } = file;
    const displayName = file.fileName || fileNameFromUrl(file.dataUrl) || t('SEARCH.UNTITLED_FILE');
    const createdAt = file.createdAt ?? message.createdAt;
    const href = frontendURL(`accounts/${accountId}/conversations/${message.conversationId}?messageId=${file.messageId}`);
    const showThumbnail = file.fileType === 'image' && Boolean(file.thumbUrl);

    const metaItems = [
        `#${message.conversationId}`,
        findInbox(message.inboxId)?.name,
        searchAuthorName(message),
        createdAt ? dynamicTime(createdAt) : '',
        file.fileSize ? formatBytes(file.fileSize) : '',
    ].filter((item): item is string => Boolean(item));

    return (
        <CardLayout
            layout="row"
            className="relative [&>div]:justify-start [&>div]:gap-3 [&>div]:px-4 [&>div]:py-3 hover:bg-n-slate-2 dark:hover:bg-n-solid-3"
        >
            {showThumbnail ? (
                <img src={file.thumbUrl} alt="" className="size-10 flex-shrink-0 rounded-lg object-cover" />
            ) : (
                <div className="flex items-center justify-center flex-shrink-0 size-10 rounded-lg bg-n-alpha-2">
                    <FileIcon
                        fileType={file.extension || extensionOf(displayName)}
                        className="size-5 text-n-slate-11"
                    />
                </div>
            )}
            <div className="flex flex-col flex-1 min-w-0 gap-1">
                <Link
                    href={href}
                    className="block min-w-0 truncate text-sm font-medium text-n-slate-12 after:absolute after:inset-0 after:rounded-xl"
                >
                    <HighlightedText text={displayName} query={query} />
                </Link>
                <div className="flex flex-wrap items-center min-w-0 text-sm gap-x-2 gap-y-0.5 text-n-slate-11">
                    {metaItems.map((item, index) => (
                        <span key={`${index}-${item}`} className="min-w-0 truncate">
                            {item}
                        </span>
                    ))}
                    {message.private ? (
                        <span className="flex items-center flex-shrink-0 gap-1 text-n-amber-11">
                            <Icon icon="i-lucide-lock-keyhole" className="flex-shrink-0 size-3.5" />
                            {t('SEARCH.PRIVATE')}
                        </span>
                    ) : null}
                </div>
            </div>
            {file.dataUrl ? (
                <Button
                    type="button"
                    ghost
                    slate
                    sm
                    icon="i-lucide-external-link"
                    aria-label={t('SEARCH.OPEN_FILE')}
                    title={t('SEARCH.OPEN_FILE')}
                    className="relative z-10 flex-shrink-0 max-md:h-11 max-md:w-11"
                    onClick={() => window.open(file.dataUrl ?? '', '_blank', 'noopener,noreferrer')}
                />
            ) : null}
        </CardLayout>
    );
}
