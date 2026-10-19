import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import type { AvailabilityStatus } from 'dashboard/types';

// Port từ dashboard/components/widgets/UserAvatarWithName.vue
interface UserAvatarWithNameProps {
    user?: {
        id?: number;
        name?: string;
        thumbnail?: string;
        availability_status?: string;
    };
    size?: number;
    textClass?: string;
}

export default function UserAvatarWithName({
    user = {},
    size = 20,
    textClass = 'text-sm text-n-slate-12',
}: UserAvatarWithNameProps) {
    return (
        <div className="flex items-center gap-1.5 text-left">
            <Avatar
                seed={avatarSeed('user', user.id)}
                src={user.thumbnail}
                size={size}
                name={user.name ?? ''}
                status={(user.availability_status as AvailabilityStatus) ?? null}
                hideOfflineStatus
                roundedFull
            />
            <span className={`my-0 truncate text-capitalize ${textClass}`}>{user.name}</span>
        </div>
    );
}
