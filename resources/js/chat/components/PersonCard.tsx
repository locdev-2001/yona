import { t } from '../../i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar';

export interface Person {
    id: number;
    name: string;
    username: string;
    avatar_url: string | null;
    bio: string | null;
}

// Thẻ hồ sơ công khai của một người tìm thấy. Nút nhắn tin thêm ở bước nhắn riêng.
export default function PersonCard({ person, onClose }: { person: Person; onClose: () => void }) {
    return (
        <article className="relative w-full max-w-sm bg-n-solid-1 px-6 pb-8 pt-10 text-center outline outline-1 outline-n-weak">
            <button
                type="button"
                onClick={onClose}
                aria-label={t('PEOPLE.CHAT.CLOSE_CARD')}
                className="absolute right-2 top-2 flex size-11 items-center justify-center rounded text-n-slate-11 hover:bg-n-alpha-1 active:scale-[0.97]"
            >
                <span className="i-lucide-x size-5" aria-hidden="true" />
            </button>
            <div className="flex justify-center">
                <Avatar src={person.avatar_url ?? ''} name={person.name} size={72} roundedFull />
            </div>
            <h2 className="mt-4 text-lg font-medium text-n-slate-12">{person.name}</h2>
            <p className="text-sm text-n-slate-11">@{person.username}</p>
            {person.bio ? <p className="mt-3 whitespace-pre-line text-sm text-n-slate-12">{person.bio}</p> : null}
        </article>
    );
}
