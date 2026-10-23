import { NotificationCenter, type NotificationEntry } from './notification-center';
import { previewCopy } from './copy';
import { usePreference } from './preferences';

type NotificationState = Record<
    string,
    { read: boolean; archived: boolean; decision?: 'pending' | 'accepted' | 'declined' }
>;
const notificationExamples: NotificationEntry[] = [
    {
        id: 'shared-report',
        actor: 'Thanh Mai',
        initials: 'TM',
        message: previewCopy.notification_shared_report,
        context: previewCopy.notification_workspace,
        time: previewCopy.notification_time_recent,
        category: 'mentions',
        accent: 'violet',
        read: false,
        archived: false,
        attachment: {
            name: 'Bao-cao-hoat-dong.csv',
            size: previewCopy.notification_file_size,
            href: 'data:text/csv;charset=utf-8,%EF%BB%BFK%C3%AAnh%2CTin%20nh%E1%BA%AFn%0AYona%2C66314%0AZalo%2C53421%0AEmail%2C28657',
        },
    },
    {
        id: 'connection-comment',
        actor: 'Tuấn Anh',
        initials: 'TA',
        message: previewCopy.notification_mentioned_you,
        context: previewCopy.notification_connection_context,
        time: previewCopy.notification_time_hour,
        category: 'mentions',
        accent: 'peach',
        read: false,
        archived: false,
        excerpt: previewCopy.notification_comment,
    },
    {
        id: 'connection-alert',
        actor: 'Ngọc Anh',
        initials: 'NA',
        message: previewCopy.notification_access_request,
        context: previewCopy.notification_report_context,
        time: previewCopy.notification_time_two_hours,
        category: 'inbox',
        accent: 'lime',
        read: false,
        archived: false,
        decision: 'pending',
    },
    {
        id: 'backup-complete',
        actor: 'Yona',
        initials: 'Y',
        message: previewCopy.notification_backup_complete,
        context: previewCopy.notification_system,
        time: previewCopy.notification_time_morning,
        category: 'inbox',
        accent: 'lime',
        read: true,
        archived: false,
        attachment: {
            name: 'Tong-hop-ket-noi.csv',
            size: '2 KB',
            href: 'data:text/csv;charset=utf-8,K%C3%AAnh%2CTr%E1%BA%A1ng%20th%C3%A1i%0AYona%2COK%0AEmail%2COK',
        },
    },
    {
        id: 'archived-report',
        actor: 'Ngọc Anh',
        initials: 'NA',
        message: previewCopy.notification_shared_report,
        context: previewCopy.notification_last_week,
        time: previewCopy.notification_time_yesterday,
        category: 'mentions',
        accent: 'violet',
        read: true,
        archived: true,
    },
];
function isNotificationState(candidate: unknown): candidate is NotificationState {
    return (
        typeof candidate === 'object' &&
        candidate !== null &&
        !Array.isArray(candidate) &&
        Object.values(candidate).every(
            (entry) =>
                typeof entry === 'object' &&
                entry !== null &&
                typeof entry.read === 'boolean' &&
                typeof entry.archived === 'boolean',
        )
    );
}
export function NotificationsPreview({ gallery = false }: { gallery?: boolean }) {
    const [savedStates, setSavedStates] = usePreference<NotificationState>(
        gallery ? 'notification-gallery' : 'notification-center',
        {},
        isNotificationState,
    );
    const entries = notificationExamples.map((entry) => ({ ...entry, ...savedStates[entry.id] }));
    return (
        <NotificationCenter
            entries={entries}
            showLabel={gallery}
            onRead={(id, read) =>
                setSavedStates((current) => ({
                    ...current,
                    [id]: {
                        ...current[id],
                        decision: entries.find((entry) => entry.id === id)?.decision,
                        read,
                        archived: false,
                    },
                }))
            }
            onReadAll={() =>
                setSavedStates(
                    Object.fromEntries(
                        entries.map((entry) => [
                            entry.id,
                            { read: true, archived: entry.archived, decision: entry.decision },
                        ]),
                    ),
                )
            }
            onDecision={(id, decision) =>
                setSavedStates((current) => ({ ...current, [id]: { read: true, archived: false, decision } }))
            }
            onArchive={(id, archived) =>
                setSavedStates((current) => ({
                    ...current,
                    [id]: {
                        ...current[id],
                        decision: entries.find((entry) => entry.id === id)?.decision,
                        read: true,
                        archived,
                    },
                }))
            }
        />
    );
}
export function NotificationGalleryDemo() {
    return <NotificationsPreview gallery />;
}
