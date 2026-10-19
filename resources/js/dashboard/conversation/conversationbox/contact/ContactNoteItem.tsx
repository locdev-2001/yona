import { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import NextButton from 'dashboard/components-next/button/Button';
import MessageFormatter from 'shared/helpers/MessageFormatter';
import { dynamicTime } from 'shared/helpers/timeHelper';

import { t } from '../../../../i18n';
import type { ContactNote } from '../../panelApi';
import { BOT_AVATAR_URL } from 'shared/constants/avatars';

// Port từ components-next/Contacts/ContactsSidebar/components/ContactNoteItem.vue.
// Ngưỡng gập: ~4 dòng (14px × 1.625 × 4) như bản gốc.
const COLLAPSE_THRESHOLD_PX = 14 * 1.625 * 4;

interface ContactNoteItemProps {
    note: ContactNote;
    writtenBy: string;
    allowDelete?: boolean;
    collapsible?: boolean;
    className?: string;
    onDelete?: (noteId: number) => void;
}

export default function ContactNoteItem({
    note,
    writtenBy,
    allowDelete = false,
    collapsible = false,
    className = '',
    onDelete,
}: ContactNoteItemProps) {
    const contentRef = useRef<HTMLParagraphElement>(null);
    const [needsCollapse, setNeedsCollapse] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (!collapsible) return;
        setNeedsCollapse((contentRef.current?.clientHeight ?? 0) > COLLAPSE_THRESHOLD_PX);
    }, [collapsible, note.content]);

    return (
        <div className={`flex flex-col gap-2 group/note ${className}`.trim()}>
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                    <Avatar
                        seed={avatarSeed('user', note.user?.id)}
                        name={note.user?.name || 'Bot'}
                        src={note.user?.name ? note.user?.thumbnail : BOT_AVATAR_URL}
                        size={16}
                        roundedFull
                    />
                    <div className="min-w-0 truncate">
                        <span className="inline-flex items-center gap-1 text-sm text-n-slate-11">
                            <span className="font-medium text-n-slate-12">{writtenBy}</span>
                            {t('CONTACTS_LAYOUT.SIDEBAR.NOTES.WROTE')}
                            <span className="font-medium text-n-slate-12">{dynamicTime(note.created_at)}</span>
                        </span>
                    </div>
                </div>
                {allowDelete ? (
                    <NextButton
                        faded
                        ruby
                        xs
                        icon="i-lucide-trash"
                        className="opacity-0 group-hover/note:opacity-100"
                        onClick={() => onDelete?.(note.id)}
                    />
                ) : null}
            </div>
            <p
                ref={contentRef}
                className={[
                    'mb-0 prose-sm prose-p:text-sm prose-p:leading-relaxed prose-p:mb-1 prose-p:mt-0 prose-ul:mb-1 prose-ul:mt-0 text-n-slate-12',
                    collapsible && !isExpanded && needsCollapse ? 'line-clamp-4' : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
                dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(new MessageFormatter(note.content || '').formattedMessage),
                }}
            />
            {collapsible && needsCollapse ? (
                <p>
                    <NextButton
                        faded
                        blue
                        xs
                        icon={isExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'}
                        label={
                            isExpanded
                                ? t('CONTACTS_LAYOUT.SIDEBAR.NOTES.COLLAPSE')
                                : t('CONTACTS_LAYOUT.SIDEBAR.NOTES.EXPAND')
                        }
                        onClick={() => setIsExpanded(!isExpanded)}
                    />
                </p>
            ) : null}
        </div>
    );
}
