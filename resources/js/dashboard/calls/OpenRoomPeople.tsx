import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import { t } from '../../i18n';
import type { OpenRoomSummary } from './types';

const MAX_ROWS = 4;

// Người đang ngồi trong phòng thoại, liệt kê ngay dưới thẻ nhóm;
// người đang chia sẻ màn hình có nhãn "Trực tiếp". Không đẩy thông báo, chỉ hiện ở đây.
export default function OpenRoomPeople({ room }: { room: OpenRoomSummary }) {
    const rows = room.participants.slice(0, MAX_ROWS);
    const hidden = room.total - rows.length;

    return (
        <ul data-testid="open-room-people" className="flex flex-col gap-0.5 mt-1 mx-2 list-none">
            {rows.map(person => (
                <li key={person.user_id} className="flex items-center gap-2 min-w-0 h-5">
                    <Avatar
                        name={person.name}
                        src={person.avatar_url ?? undefined}
                        seed={avatarSeed('user', person.user_id)}
                        size={16}
                    />
                    <span className="flex-1 min-w-0 text-xs truncate text-n-slate-11">{person.name}</span>
                    {person.is_sharing_screen ? (
                        <span className="flex-shrink-0 px-1.5 rounded-md text-[0.625rem] font-bold leading-4 uppercase bg-n-ruby-9 text-white">
                            {t('CALLS.ROOM.LIVE')}
                        </span>
                    ) : null}
                </li>
            ))}
            {hidden > 0 ? <li className="ps-6 text-xs text-n-slate-10">{t('CALLS.ROOM.MORE_PEOPLE', { count: hidden })}</li> : null}
        </ul>
    );
}
