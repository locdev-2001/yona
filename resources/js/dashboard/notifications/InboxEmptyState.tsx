import Spinner from 'dashboard/components-next/spinner/Spinner';
import FluentIcon from 'shared/components/FluentIcon/FluentIcon';
import { t } from '../../i18n';
import { useNotifications } from './NotificationsContext';

// Port từ routes/dashboard/inbox/InboxEmptyState.vue.
export default function InboxEmptyState({ emptyStateMessage = '' }: { emptyStateMessage?: string }) {
    const { isFetching } = useNotifications();

    return (
        <div className="items-center justify-center hidden w-full h-full text-center bg-n-surface-1 lg:flex">
            {isFetching ? (
                <div className="flex justify-center my-4">
                    <Spinner className="text-n-brand" />
                </div>
            ) : (
                <div className="flex flex-col items-center gap-2">
                    <FluentIcon icon="mail-inbox" size={40} className="text-n-slate-11" />
                    <span className="text-sm font-medium text-n-slate-11">
                        {emptyStateMessage || t('INBOX.LIST.NOTE')}
                    </span>
                </div>
            )}
        </div>
    );
}
