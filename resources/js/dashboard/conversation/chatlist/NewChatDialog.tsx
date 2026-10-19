import { forwardRef, useState } from 'react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import { usePeopleSearch } from 'shared/people/usePeopleSearch';
import { t } from '../../../i18n';
import { useConversation } from '../ConversationContext';

// Bắt đầu trò chuyện mới: tìm người theo @username hoặc tên, chọn là mở hội thoại 1-1.
const NewChatDialog = forwardRef<DialogHandle>(function NewChatDialog(_props, ref) {
    const { openDirectChat } = useConversation();
    const [query, setQuery] = useState('');
    const search = usePeopleSearch(query);

    return (
        <Dialog
            ref={ref}
            title={t('CHAT.NEW.TITLE')}
            description={t('CHAT.NEW.DESCRIPTION')}
            showConfirmButton={false}
            onClose={() => setQuery('')}
        >
            <div className="field-surface flex items-center gap-2 h-11 px-2.5 rounded-lg">
                <span className="i-lucide-search size-[1.125rem] shrink-0 text-n-slate-10" aria-hidden="true" />
                <input
                    type="search"
                    value={query}
                    autoFocus
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder={t('PEOPLE.CHAT.SEARCH_PLACEHOLDER')}
                    aria-label={t('PEOPLE.CHAT.SEARCH_LABEL')}
                    className="reset-base flex-1 min-w-0 h-full m-0 p-0 text-[0.9375rem] bg-transparent border-none shadow-none outline-none text-n-slate-12 placeholder:text-n-slate-10"
                    onChange={event => setQuery(event.target.value)}
                />
            </div>
            <div className="mt-2 min-h-24" aria-busy={search.status === 'loading'}>
                {search.status === 'error' ? <p className="py-3 text-sm text-n-ruby-11">{t('PEOPLE.CHAT.SEARCH_ERROR')}</p> : null}
                {search.status === 'done' && search.people.length === 0 ? (
                    <p className="py-3 text-sm text-n-slate-11">{t('PEOPLE.CHAT.NO_RESULTS')}</p>
                ) : null}
                {search.status === 'idle' ? <p className="py-3 text-sm text-n-slate-11">{t('CHAT.NEW.HINT')}</p> : null}
                <ul className="flex flex-col gap-0.5 m-0 p-0 list-none">
                    {search.people.map(person => (
                        <li key={person.id}>
                            <button
                                type="button"
                                className="flex items-center gap-3 w-full min-h-14 px-2 py-2 rounded-lg text-start hover:bg-n-surface-hover active:scale-[0.97]"
                                onClick={() => void openDirectChat(person.id)}
                            >
                                <Avatar seed={avatarSeed('user', person.id)} src={person.avatar_url ?? ''} name={person.name} size={36} />
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-medium text-n-slate-12">{person.name}</span>
                                    <span className="block truncate text-xs text-n-slate-11">@{person.username}</span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </Dialog>
    );
});

export default NewChatDialog;
