import Loader from 'shared/components/loader/Loader';
import { t } from '../../i18n';
import { useNotifications } from './NotificationsContext';
import { ICONS } from 'dashboard/icons';

// Port từ routes/dashboard/inbox/InboxEmptyState.vue.
export default function InboxEmptyState({ emptyStateMessage = '' }: { emptyStateMessage?: string }) {
    const { isFetching } = useNotifications();

    return (
        <div className="items-center justify-center hidden w-full h-full text-center bg-n-surface-1 lg:flex">
            {isFetching ? (
                <div className="flex justify-center my-4">
                    <Loader className="text-n-brand" />
                </div>
            ) : (
                <div className="flex flex-col items-center gap-2">
                    <span className={`${ICONS.inbox} size-10 text-n-slate-11`} aria-hidden="true" />
                    <span className="text-sm font-medium text-n-slate-11">
                        {emptyStateMessage || t('INBOX.LIST.NOTE')}
                    </span>
                </div>
            )}
        </div>
    );
}
