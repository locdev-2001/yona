import { useState } from 'react';
import { Archive, ArchiveRestore, Bell, Check, CheckCheck, Download, FileText, Inbox, Mail, X } from '@admin/components/icons';
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@admin/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@admin/components/ui/tabs';
import { PreviewButton, SkeletonBlock } from './components';
import { previewCopy, previewText, useDesignCopy } from './copy';
import { spacingPixels } from './tokens';
import './notification-center.css';

export type NotificationEntry = {
    id: string;
    actor: string;
    initials: string;
    message: string;
    context: string;
    time: string;
    category: 'mentions' | 'inbox';
    accent: 'lime' | 'violet' | 'peach';
    read: boolean;
    archived: boolean;
    excerpt?: string;
    decision?: 'pending' | 'accepted' | 'declined';
    attachment?: { name: string; size: string; href: string };
};

type NotificationFilter = 'all' | 'mentions' | 'inbox' | 'archive';

export function NotificationCenter({
    entries,
    onRead,
    onReadAll,
    onArchive,
    onDecision,
    showLabel = false,
    loading = false,
}: {
    entries: NotificationEntry[];
    onRead: (id: string, read: boolean) => void;
    onReadAll: () => void;
    onArchive: (id: string, archived: boolean) => void;
    onDecision: (id: string, decision: 'accepted' | 'declined') => void;
    showLabel?: boolean;
    loading?: boolean;
}) {
    const { copy: previewCopy, text: previewText } = useDesignCopy();
    const notificationFilters: { id: NotificationFilter; label: string }[] = [
        { id: 'all', label: previewCopy.notification_all },
        { id: 'mentions', label: previewCopy.notification_mentions },
        { id: 'inbox', label: previewCopy.notification_inbox },
        { id: 'archive', label: previewCopy.notification_archive },
    ];

    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState<NotificationFilter>('all');
    const [announcement, setAnnouncement] = useState('');
    const unreadCount = entries.filter((entry) => !entry.read && !entry.archived).length;
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <PreviewButton
                        appearance="ghost"
                        className={`notification-trigger ${showLabel ? 'notification-trigger--label' : ''}`}
                    />
                }
                aria-label={loading ? previewCopy.notification_title : previewText('notification_open', unreadCount)}
            >
                <Bell />
                {showLabel && <span>{previewCopy.notification_title}</span>}
                {unreadCount > 0 && <i className="notification-dot" aria-hidden="true" />}
            </PopoverTrigger>
            <PopoverContent
                className="catalogue-popup notification-panel"
                align="end"
                sideOffset={spacingPixels('control-gap')}
            >
                <header className="notification-header">
                    <div className="notification-heading">
                        <PopoverTitle>{previewCopy.notification_title}</PopoverTitle>
                    </div>
                    <div className="notification-tools">
                        <PreviewButton
                            appearance="ghost"
                            className="notification-icon-button"
                            disabled={loading || unreadCount === 0}
                            aria-label={previewCopy.notification_read_all}
                            title={previewCopy.notification_read_all}
                            onClick={() => {
                                onReadAll();
                                setAnnouncement(previewCopy.notification_all_read);
                            }}
                        >
                            <CheckCheck />
                        </PreviewButton>
                        <PreviewButton
                            appearance="ghost"
                            className="notification-icon-button"
                            aria-label={previewCopy.notification_close}
                            onClick={() => setOpen(false)}
                        >
                            <X />
                        </PreviewButton>
                    </div>
                </header>
                <Tabs
                    value={filter}
                    onValueChange={(value) => setFilter(value as NotificationFilter)}
                    className="notification-tabs"
                >
                    <TabsList aria-label={previewCopy.notification_filters}>
                        {notificationFilters.map((option) => (
                            <TabsTrigger key={option.id} value={option.id}>
                                {option.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {notificationFilters.map((option) => {
                        const matching = entries.filter((entry) =>
                            option.id === 'archive'
                                ? entry.archived
                                : !entry.archived && (option.id === 'all' || entry.category === option.id),
                        );
                        return (
                            <TabsContent key={option.id} value={option.id} className="notification-list">
                                {loading ? (
                                    <div className="notification-empty" aria-busy="true">
                                        <SkeletonBlock className="skeleton-caption" />
                                        <SkeletonBlock className="skeleton-value" />
                                        <SkeletonBlock className="skeleton-caption" />
                                    </div>
                                ) : matching.length === 0 ? (
                                    <div className="notification-empty">
                                        <Inbox />
                                        <strong>{previewCopy.notification_empty}</strong>
                                        <p>{previewCopy.notification_empty_description}</p>
                                    </div>
                                ) : (
                                    <ul>
                                        {matching.map((entry) => (
                                            <li key={entry.id}>
                                                <article
                                                    className="notification-entry"
                                                    data-unread={!entry.read && !entry.archived}
                                                >
                                                    <span
                                                        className="notification-avatar"
                                                        data-accent={entry.accent}
                                                        aria-hidden="true"
                                                    >
                                                        {entry.initials}
                                                        {!entry.read && !entry.archived && <i />}
                                                    </span>
                                                    <div className="notification-entry-content">
                                                        <p className="notification-summary">
                                                            <strong>{entry.actor}</strong> {entry.message}{' '}
                                                            <span className="notification-context">
                                                                {entry.context}
                                                            </span>
                                                        </p>
                                                        <div className="notification-meta-row">
                                                            <div className="notification-meta">
                                                                <span>{entry.time}</span>
                                                            </div>
                                                            <div className="notification-entry-actions">
                                                                {!entry.archived && (
                                                                    <button
                                                                        onClick={() => {
                                                                            onRead(entry.id, !entry.read);
                                                                            setAnnouncement(
                                                                                previewText(
                                                                                    entry.read
                                                                                        ? 'notification_unread_done'
                                                                                        : 'notification_read_done',
                                                                                    entry.actor,
                                                                                ),
                                                                            );
                                                                        }}
                                                                        aria-label={previewText(
                                                                            entry.read
                                                                                ? 'notification_unread_item'
                                                                                : 'notification_read_item',
                                                                            entry.actor,
                                                                        )}
                                                                    >
                                                                        {entry.read ? <Mail /> : <Check />}
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => {
                                                                        onArchive(entry.id, !entry.archived);
                                                                        setAnnouncement(
                                                                            entry.archived
                                                                                ? previewCopy.notification_restored
                                                                                : previewCopy.notification_archived,
                                                                        );
                                                                    }}
                                                                    aria-label={previewText(
                                                                        entry.archived
                                                                            ? 'notification_restore_item'
                                                                            : 'notification_archive_item',
                                                                        entry.actor,
                                                                    )}
                                                                >
                                                                    {entry.archived ? <ArchiveRestore /> : <Archive />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {entry.excerpt && (
                                                            <blockquote title={entry.excerpt}>
                                                                <p>{entry.excerpt}</p>
                                                            </blockquote>
                                                        )}
                                                        {entry.decision === 'pending' && (
                                                            <div className="notification-request-actions">
                                                                <button
                                                                    onClick={() => onDecision(entry.id, 'declined')}
                                                                >
                                                                    {previewCopy.notification_decline}
                                                                </button>
                                                                <button
                                                                    data-primary
                                                                    onClick={() => onDecision(entry.id, 'accepted')}
                                                                >
                                                                    {previewCopy.notification_accept}
                                                                </button>
                                                            </div>
                                                        )}
                                                        {entry.decision && entry.decision !== 'pending' && (
                                                            <p className="notification-decision">
                                                                {entry.decision === 'accepted'
                                                                    ? previewCopy.notification_accepted
                                                                    : previewCopy.notification_declined}
                                                            </p>
                                                        )}
                                                        {entry.attachment && (
                                                            <a
                                                                className="notification-attachment"
                                                                href={entry.attachment.href}
                                                                download={entry.attachment.name}
                                                                aria-label={previewText(
                                                                    'notification_download',
                                                                    entry.attachment.name,
                                                                )}
                                                            >
                                                                <span className="notification-file-icon">
                                                                    <FileText />
                                                                </span>
                                                                <span>
                                                                    <strong>{entry.attachment.name}</strong>
                                                                    <small>{entry.attachment.size}</small>
                                                                </span>
                                                                <Download />
                                                            </a>
                                                        )}
                                                    </div>
                                                </article>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </TabsContent>
                        );
                    })}
                </Tabs>
                <span className="sr-only" role="status">
                    {announcement}
                </span>
            </PopoverContent>
        </Popover>
    );
}
