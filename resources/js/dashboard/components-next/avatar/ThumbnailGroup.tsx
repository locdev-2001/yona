import Avatar from './Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';

// Port từ dashboard/components/widgets/ThumbnailGroup.vue. Đặt cạnh Avatar vì
// components/widgets/ của yona không thuộc vùng sửa của B11 (ghi nợ: dời về đúng
// cây gốc khi mở lại vùng đó). Tooltip từng avatar (v-tooltip) chưa port —
// Avatar của yona chưa nhận prop title.
interface ThumbnailUser {
    id: number;
    name?: string;
    thumbnail?: string;
}

interface ThumbnailGroupProps {
    usersList: ThumbnailUser[];
    size?: number;
    showMoreThumbnailsCount?: boolean;
    moreThumbnailsText?: string;
    gap?: 'normal' | 'tight';
}

export default function ThumbnailGroup({
    usersList,
    size = 24,
    showMoreThumbnailsCount = false,
    moreThumbnailsText = '',
    gap = 'normal',
}: ThumbnailGroupProps) {
    const gapClass =
        gap === 'tight'
            ? 'ltr:[&:not(:first-child)]:-ml-2 rtl:[&:not(:first-child)]:-mr-2'
            : 'ltr:[&:not(:first-child)]:-ml-1 rtl:[&:not(:first-child)]:-mr-1';
    const moreThumbnailsClass = gap === 'tight' ? 'ltr:-ml-2 rtl:-mr-2' : 'ltr:-ml-1 rtl:-mr-1';

    return (
        <div className="flex">
            {usersList.map(user => (
                <Avatar
                    seed={avatarSeed('user', user.id)}
                    key={user.id}
                    src={user.thumbnail}
                    name={user.name ?? ''}
                    size={size}
                    roundedFull
                    className={`[&>span]:outline [&>span]:outline-1 [&>span]:outline-n-background [&>span]:shadow ${gapClass}`}
                />
            ))}
            {showMoreThumbnailsCount ? (
                <span
                    className={`text-n-slate-11 bg-n-slate-4 outline outline-1 outline-n-background text-xs font-medium rounded-full px-2 inline-flex items-center shadow relative ${moreThumbnailsClass}`}
                >
                    {moreThumbnailsText}
                </span>
            ) : null}
        </div>
    );
}
