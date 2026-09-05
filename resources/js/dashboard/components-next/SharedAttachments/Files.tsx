import { useState } from 'react';
import { downloadFile } from '@chatwoot/utils';

import FileIcon from 'dashboard/components-next/icon/FileIcon';
import NextButton from 'dashboard/components-next/button/Button';
import type { MessageAttachment } from 'dashboard/components-next/message/helpers/attachments';
import { useAlert } from 'dashboard/composables/useAlert';
import {
    fileAttachments as sortFileAttachments,
    fileNameFromUrl,
} from 'dashboard/conversation/conversationbox/contact/sharedAttachments';
import { formatBytes } from 'shared/helpers/FileHelper';
import { dynamicTime, shortTimestamp } from 'shared/helpers/timeHelper';

import { t } from '../../../i18n';

// Port từ dashboard/components-next/SharedAttachments/Files.vue.
interface FilesProps {
    attachments: MessageAttachment[];
    peekLimit?: number;
    showJumpToMessage?: boolean;
    onSelect: (attachment: MessageAttachment) => void;
    onJumpToMessage?: (attachment: MessageAttachment) => void;
}

export default function Files({
    attachments,
    peekLimit = 0,
    showJumpToMessage = false,
    onSelect,
    onJumpToMessage,
}: FilesProps) {
    const [showAll, setShowAll] = useState(false);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);

    const fileList = sortFileAttachments(attachments);
    if (!fileList.length) return null;

    const isPeekable = peekLimit > 0;
    const visibleFiles = !isPeekable || showAll ? fileList : fileList.slice(0, peekLimit);

    const displayName = (attachment: MessageAttachment): string =>
        fileNameFromUrl(attachment.data_url) || t('CONVERSATION_SIDEBAR.SHARED_FILES.UNTITLED_FILE');

    const displaySize = (attachment: MessageAttachment): string => {
        if (attachment.file_size) return formatBytes(attachment.file_size);
        if (attachment.extension) return attachment.extension.toUpperCase();

        return '—';
    };

    const displayTime = (attachment: MessageAttachment): string =>
        attachment.created_at ? shortTimestamp(dynamicTime(attachment.created_at), true) : '';

    const onDownloadFile = async (attachment: MessageAttachment) => {
        try {
            setDownloadingId(attachment.id);
            await downloadFile({
                url: attachment.data_url ?? '',
                type: attachment.file_type,
                extension: attachment.extension ?? null,
            });
        } catch {
            useAlert(t('CONVERSATION_SIDEBAR.SHARED_FILES.DOWNLOAD_ERROR'));
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <section className="flex flex-col gap-2.5">
            <header className="flex items-center justify-between px-0.5">
                <h4 className="text-xs font-semibold tracking-wider uppercase text-n-slate-11">
                    {t('CONVERSATION_SIDEBAR.SHARED_FILES.FILES_HEADING')}
                    <span className="ms-1 font-medium tracking-normal normal-case text-n-slate-10">
                        {fileList.length}
                    </span>
                </h4>
                {isPeekable && fileList.length > peekLimit ? (
                    <NextButton
                        ghost
                        slate
                        xs
                        trailingIcon
                        icon={showAll ? 'i-lucide-chevron-up' : 'i-lucide-chevron-right'}
                        label={
                            showAll
                                ? t('CONVERSATION_SIDEBAR.SHARED_FILES.SHOW_LESS')
                                : t('CONVERSATION_SIDEBAR.SHARED_FILES.VIEW_ALL')
                        }
                        onClick={() => setShowAll(!showAll)}
                    />
                ) : null}
            </header>
            <ul className="flex flex-col gap-0.5">
                {visibleFiles.map(attachment => (
                    <li
                        key={attachment.id}
                        role="button"
                        tabIndex={0}
                        className="flex items-center gap-3 px-2 py-2 transition-colors rounded-lg cursor-pointer hover:bg-n-slate-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-n-blue-9"
                        onClick={() => onSelect(attachment)}
                        onKeyDown={event => {
                            if (event.key === 'Enter') onSelect(attachment);
                            if (event.key === ' ') {
                                event.preventDefault();
                                onSelect(attachment);
                            }
                        }}
                    >
                        <div className="flex items-center justify-center rounded-lg size-9 shrink-0 bg-gradient-to-br from-n-slate-3 to-n-slate-4 ring-1 ring-inset ring-n-slate-4/40">
                            <FileIcon
                                fileType={attachment.extension?.toLowerCase() ?? ''}
                                className="size-4 text-n-slate-11"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-n-slate-12 mb-1">
                                {displayName(attachment)}
                            </p>
                            <p className="text-xs text-n-slate-11">
                                {displaySize(attachment)}
                                {displayTime(attachment) ? ` · ${displayTime(attachment)}` : null}
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            {showJumpToMessage && attachment.message_id ? (
                                <NextButton
                                    ghost
                                    slate
                                    sm
                                    icon="i-lucide-external-link"
                                    className="opacity-0 group-hover:opacity-100"
                                    title={t('CONVERSATION_SIDEBAR.SHARED_FILES.JUMP_TO_MESSAGE')}
                                    aria-label={t('CONVERSATION_SIDEBAR.SHARED_FILES.JUMP_TO_MESSAGE')}
                                    onClick={event => {
                                        event.stopPropagation();
                                        onJumpToMessage?.(attachment);
                                    }}
                                    onKeyDown={event => event.stopPropagation()}
                                />
                            ) : null}
                            <NextButton
                                ghost
                                slate
                                sm
                                icon="i-lucide-download"
                                className="opacity-0 group-hover:opacity-100"
                                isLoading={downloadingId === attachment.id}
                                aria-label={t('CONVERSATION_SIDEBAR.SHARED_FILES.DOWNLOAD')}
                                onClick={event => {
                                    event.stopPropagation();
                                    void onDownloadFile(attachment);
                                }}
                                onKeyDown={event => event.stopPropagation()}
                            />
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
