import { useEffect, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';

import type { SharedPageProps } from '../types';

import { t } from '../i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import SnackbarContainer from 'v3/components/SnackBar/Container';
import PersonCard from './components/PersonCard';
import type { Person } from './components/PersonCard';
import { usePeopleSearch } from './usePeopleSearch';

// Trang chính của app nhắn tin. Cột trái là danh sách (hiện là tìm người),
// cột phải là khung hội thoại; trên điện thoại chỉ một cột.
export default function ChatIndex() {
    const { auth } = usePage<SharedPageProps>().props;
    const me = auth.user;
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<Person | null>(null);
    const search = usePeopleSearch(query);

    useEffect(() => setSelected(null), [query]);

    return (
        <div className="flex h-dvh w-full bg-n-background text-n-slate-12">
            <aside
                className={`flex w-full flex-col border-r border-n-weak md:w-80 md:shrink-0 ${selected ? 'hidden md:flex' : 'flex'}`}
            >
                <header className="flex items-center gap-3 px-4 py-3">
                    <h1 className="text-lg font-medium">{t('PEOPLE.CHAT.TITLE')}</h1>
                    <Link
                        href="/chat/profile"
                        className="ml-auto flex size-11 items-center justify-center rounded-full active:scale-[0.97]"
                        aria-label={t('PEOPLE.CHAT.PROFILE_LINK')}
                    >
                        <Avatar src={me?.avatar_url ?? ''} name={me?.display_name || me?.name || ''} size={32} roundedFull />
                    </Link>
                </header>
                <div className="px-4 pb-3">
                    <label className="flex items-center gap-2 rounded bg-n-alpha-black2 px-3 outline outline-1 outline-n-weak focus-within:outline-n-brand">
                        <span className="i-lucide-search size-4 text-n-slate-11" aria-hidden="true" />
                        <span className="sr-only">{t('PEOPLE.CHAT.SEARCH_LABEL')}</span>
                        <input
                            type="search"
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            placeholder={t('PEOPLE.CHAT.SEARCH_PLACEHOLDER')}
                            autoCapitalize="none"
                            spellCheck={false}
                            className="reset-base min-h-11 w-full border-none bg-transparent text-sm outline-none"
                        />
                    </label>
                </div>
                <div className="flex-1 overflow-y-auto px-2">
                    <PeopleResults search={search} selectedId={selected?.id ?? null} onSelect={setSelected} />
                </div>
            </aside>
            <main className={`flex-1 items-center justify-center p-4 ${selected ? 'flex' : 'hidden md:flex'}`}>
                {selected ? (
                    <PersonCard person={selected} onClose={() => setSelected(null)} />
                ) : (
                    <div className="max-w-xs text-center">
                        {search.people.length > 0 ? (
                            <p className="text-sm text-n-slate-11">{t('PEOPLE.CHAT.PICK_PERSON')}</p>
                        ) : (
                            <EmptyHint />
                        )}
                    </div>
                )}
            </main>
            <SnackbarContainer />
        </div>
    );
}

interface PeopleResultsProps {
    search: ReturnType<typeof usePeopleSearch>;
    selectedId: number | null;
    onSelect: (person: Person) => void;
}

function PeopleResults({ search, selectedId, onSelect }: PeopleResultsProps) {
    if (search.status === 'idle') {
        return (
            <div className="px-2 py-8 text-center md:hidden">
                <EmptyHint />
            </div>
        );
    }

    if (search.status === 'error') {
        return <p className="px-2 py-3 text-sm text-n-ruby-11">{t('PEOPLE.CHAT.SEARCH_ERROR')}</p>;
    }

    if (search.status === 'done' && search.people.length === 0) {
        return <p className="px-2 py-3 text-sm text-n-slate-11">{t('PEOPLE.CHAT.NO_RESULTS')}</p>;
    }

    return (
        <section aria-busy={search.status === 'loading'}>
            <h2 className="px-2 pb-1 pt-2 text-xs text-n-slate-11">{t('PEOPLE.CHAT.PEOPLE')}</h2>
            <ul>
                {search.people.map(person => (
                    <li key={person.id}>
                        <button
                            type="button"
                            onClick={() => onSelect(person)}
                            aria-pressed={person.id === selectedId}
                            className={`flex min-h-14 w-full items-center gap-3 rounded px-2 py-2 text-left hover:bg-n-alpha-1 active:scale-[0.97] ${
                                person.id === selectedId ? 'bg-n-alpha-2' : ''
                            }`}
                        >
                            <Avatar src={person.avatar_url ?? ''} name={person.name} size={36} roundedFull />
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-medium">{person.name}</span>
                                <span className="block truncate text-xs text-n-slate-11">@{person.username}</span>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}

function EmptyHint() {
    return (
        <>
            <span className="i-lucide-message-circle mx-auto block size-8 text-n-slate-10" aria-hidden="true" />
            <h2 className="mt-3 text-base font-medium">{t('PEOPLE.CHAT.EMPTY_TITLE')}</h2>
            <p className="mt-1 text-sm text-n-slate-11">{t('PEOPLE.CHAT.EMPTY_BODY')}</p>
        </>
    );
}
