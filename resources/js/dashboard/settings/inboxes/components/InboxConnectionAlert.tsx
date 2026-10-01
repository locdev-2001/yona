import { t } from '../../../../i18n';
import type { Inbox } from '../types';

// Cảnh báo dùng chung cho mọi kênh khai `reauthorization_required`: lời nhắn cụ thể
// của kênh (connection_error) nếu có, kèm đường sửa — kết nối lại qua nhà cung cấp
// (reconnect_url) hoặc mở phần cấu hình kết nối.
interface InboxConnectionAlertProps {
    inbox: Pick<Inbox, 'reauthorization_required' | 'connection_error' | 'reconnect_url'>;
    onFixSettings?: () => void;
    className?: string;
}

export default function InboxConnectionAlert({ inbox, onFixSettings, className = '' }: InboxConnectionAlertProps) {
    if (!inbox.reauthorization_required) return null;

    return (
        <div
            role="alert"
            className={`flex flex-col gap-2 rounded-xl border border-n-ruby-6 bg-n-ruby-2 px-4 py-3 text-body-main text-n-ruby-12 sm:flex-row sm:items-center sm:justify-between ${className}`}
        >
            <p className="min-w-0 break-words">{inbox.connection_error || t('INBOX_MGMT.CONNECTION_CHECK.BANNER_DEFAULT')}</p>
            {inbox.reconnect_url ? (
                <a
                    href={inbox.reconnect_url}
                    className="shrink-0 font-medium underline underline-offset-2 text-n-ruby-12"
                >
                    {t('INBOX_MGMT.CONNECTION_CHECK.RECONNECT')}
                </a>
            ) : onFixSettings ? (
                <button
                    type="button"
                    className="shrink-0 font-medium underline underline-offset-2 text-n-ruby-12"
                    onClick={onFixSettings}
                >
                    {t('INBOX_MGMT.CONNECTION_CHECK.FIX_SETTINGS')}
                </button>
            ) : null}
        </div>
    );
}
