import { useState } from 'react';
import type { ReactNode } from 'react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import type { Person } from 'shared/people/person';
import { usePeopleSearch } from './usePeopleSearch';
import { t } from '../../i18n';

export type PickedPerson = Pick<Person, 'id' | 'name' | 'username' | 'avatar_url'>;

interface PeoplePickerProps {
    // Chọn một người rồi thôi (nhắn 1-1).
    onPick?: (person: PickedPerson) => void;
    // Chọn nhiều người (tạo nhóm, thêm thành viên).
    selected?: PickedPerson[];
    onChange?: (people: PickedPerson[]) => void;
    excludeIds?: number[];
    // Ô tìm do nơi dùng giữ (để đóng mở hộp vẫn còn chữ đang tìm); vắng thì tự giữ.
    query?: string;
    onQueryChange?: (query: string) => void;
    // Chỉ tìm trong bạn bè (thêm trực tiếp vào nhóm); ô tìm trống thì hiện sẵn bạn bè.
    friendsOnly?: boolean;
    // Lối đi tiếp khi không tìm thấy ai (vd mở hộp kết bạn).
    emptyAction?: ReactNode;
}

// Tìm người theo @username hoặc tên. Có `selected` thì thành chế độ chọn nhiều, người
// đã chọn hiện thành chip phía trên ô tìm.
export default function PeoplePicker({
    onPick,
    selected,
    onChange,
    excludeIds = [],
    query: controlledQuery,
    onQueryChange,
    friendsOnly = false,
    emptyAction,
}: PeoplePickerProps) {
    const [ownQuery, setOwnQuery] = useState('');
    const query = controlledQuery ?? ownQuery;
    const setQuery = onQueryChange ?? setOwnQuery;
    const search = usePeopleSearch(query, { friendsOnly });
    const isMulti = selected !== undefined;
    const selectedIds = new Set((selected ?? []).map(person => person.id));
    const results = search.people.filter(person => !excludeIds.includes(person.id));

    const toggle = (person: PickedPerson) => {
        if (!isMulti) {
            onPick?.(person);
            return;
        }
        onChange?.(selectedIds.has(person.id) ? selected.filter(item => item.id !== person.id) : [...selected, person]);
    };

    return (
        <div className="flex flex-col gap-2">
            {isMulti && selected.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                    <span className="w-full text-xs text-n-slate-11">{t('CHAT.GROUP.SELECTED', { count: selected.length })}</span>
                    {selected.map(person => (
                        <button
                            key={person.id}
                            type="button"
                            className="flex items-center gap-1.5 h-8 ps-1 pe-2 rounded-full bg-n-alpha-2 text-sm text-n-slate-12 active:scale-[0.97]"
                            onClick={() => toggle(person)}
                        >
                            <Avatar seed={avatarSeed('user', person.id)} src={person.avatar_url ?? ''} name={person.name} size={24} />
                            <span className="max-w-32 truncate">{person.name}</span>
                            <span className="i-lucide-x size-3.5 text-n-slate-11" aria-hidden="true" />
                        </button>
                    ))}
                </div>
            ) : null}
            <div className="field-surface flex items-center gap-2 h-11 px-2.5 rounded-lg">
                <span className="i-lucide-search size-[1.125rem] shrink-0 text-n-slate-10" aria-hidden="true" />
                <input
                    type="search"
                    value={query}
                    autoFocus={!isMulti}
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder={isMulti ? t('CHAT.GROUP.PICK_MEMBERS') : t('PEOPLE.CHAT.SEARCH_PLACEHOLDER')}
                    aria-label={t('PEOPLE.CHAT.SEARCH_LABEL')}
                    className="reset-base flex-1 min-w-0 h-full m-0 p-0 text-[0.9375rem] bg-transparent border-none shadow-none outline-none text-n-slate-12 placeholder:text-n-slate-10"
                    onChange={event => setQuery(event.target.value)}
                />
            </div>
            <div className="min-h-24 max-h-72 overflow-y-auto" aria-busy={search.status === 'loading'}>
                {search.status === 'error' ? <p className="py-3 text-sm text-n-ruby-11">{t('PEOPLE.CHAT.SEARCH_ERROR')}</p> : null}
                {search.status === 'done' && results.length === 0 ? (
                    <div className="flex flex-col items-start gap-2 py-3">
                        <p className="m-0 text-sm text-n-slate-11">{t(friendsOnly ? 'CHAT.GROUP.NO_FRIENDS' : 'PEOPLE.CHAT.NO_RESULTS')}</p>
                        {emptyAction}
                    </div>
                ) : null}
                {search.status === 'idle' ? <p className="py-3 text-sm text-n-slate-11">{t('CHAT.NEW.HINT')}</p> : null}
                <ul className="flex flex-col gap-0.5 m-0 p-0 list-none">
                    {results.map(person => (
                        <li key={person.id}>
                            <button
                                type="button"
                                aria-pressed={isMulti ? selectedIds.has(person.id) : undefined}
                                className="flex items-center gap-3 w-full min-h-14 px-2 py-2 rounded-lg text-start hover:bg-n-surface-hover active:scale-[0.97]"
                                onClick={() => toggle(person)}
                            >
                                <Avatar seed={avatarSeed('user', person.id)} src={person.avatar_url ?? ''} name={person.name} size={36} />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-n-slate-12">{person.name}</span>
                                    <span className="block truncate text-xs text-n-slate-11">@{person.username}</span>
                                </span>
                                {isMulti ? (
                                    <span
                                        className={`size-5 shrink-0 rounded-full border ${
                                            selectedIds.has(person.id) ? 'i-lucide-circle-check text-n-brand border-transparent' : 'border-n-slate-7'
                                        }`}
                                        aria-hidden="true"
                                    />
                                ) : null}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
