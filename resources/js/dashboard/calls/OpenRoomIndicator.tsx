import Icon from 'dashboard/components-next/icon/Icon';
import { t } from '../../i18n';
import CallDuration from './CallDuration';
import type { OpenRoomSummary } from './types';

// Loa xanh + thời lượng phòng ở dòng trên của thẻ nhóm khi phòng thoại đang mở.
export default function OpenRoomIndicator({ room }: { room: OpenRoomSummary }) {
    return (
        <span
            className="flex items-center gap-1 flex-shrink-0 text-xs font-medium text-n-teal-11"
            title={t('CALLS.ROOM.OPEN_IN_LIST', { count: room.total })}
        >
            <Icon icon="i-lucide-headphones" className="size-3" />
            <CallDuration startedAt={room.started_at} />
        </span>
    );
}
