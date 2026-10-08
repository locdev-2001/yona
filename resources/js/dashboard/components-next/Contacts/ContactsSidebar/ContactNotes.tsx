import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import Editor from 'dashboard/components-next/Editor/Editor';
import Button from 'dashboard/components-next/button/Button';
import Loader from 'shared/components/loader/Loader';
import ContactNoteItem from 'dashboard/conversation/conversationbox/contact/ContactNoteItem';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import { createContactNote, deleteContactNote, fetchContactNotes } from 'dashboard/conversation/panelApi';
import type { ContactNote } from 'dashboard/conversation/panelApi';
import type { DashboardPageProps } from '../../../types';

// Port từ components-next/Contacts/ContactsSidebar/ContactNotes.vue.
// Dùng lại ContactNoteItem + panelApi đã port ở B11 (một nguồn duy nhất).
interface ContactNotesProps {
    contactId: number;
}

export default function ContactNotes({ contactId }: ContactNotesProps) {
    const { auth, currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;

    const [notes, setNotes] = useState<ContactNote[]>([]);
    const [message, setMessage] = useState('');
    const [isFetching, setFetching] = useState(true);
    const [isCreating, setCreating] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setFetching(true);
        fetchContactNotes(accountId, contactId)
            .catch(() => [] as ContactNote[])
            .then(payload => {
                if (cancelled) return;
                setNotes(payload);
                setFetching(false);
            });

        return () => {
            cancelled = true;
        };
    }, [accountId, contactId]);

    const onAdd = async (content: string) => {
        if (!content || isCreating) return;

        setCreating(true);
        try {
            const created = await createContactNote(accountId, contactId, content);
            setNotes(current => [created, ...current]);
            setMessage('');
        } finally {
            setCreating(false);
        }
    };

    const onDelete = async (noteId: number) => {
        if (!noteId) return;
        await deleteContactNote(accountId, contactId, noteId);
        setNotes(current => current.filter(note => note.id !== noteId));
    };

    useKeyboardEvents({
        '$mod+Enter': {
            action: () => void onAdd(message),
            allowOnFocusedInput: true,
        },
    });

    const getWrittenBy = (note: ContactNote) =>
        note?.user?.id === auth.user?.id ? t('CONTACTS_LAYOUT.SIDEBAR.NOTES.YOU') : (note?.user?.name ?? 'Bot');

    return (
        <div className="flex flex-col gap-6">
            <Editor
                value={message}
                uiSettings={auth.user?.ui_settings ?? {}}
                placeholder={t('CONTACTS_LAYOUT.SIDEBAR.NOTES.PLACEHOLDER')}
                focusOnMount
                className="[&>div]:!border-transparent [&>div]:px-4 [&>div]:py-4 px-6"
                onChange={setMessage}
                actions={
                    <div className="flex items-center gap-3">
                        <Button
                            variant="link"
                            color="blue"
                            size="sm"
                            label={t('CONTACTS_LAYOUT.SIDEBAR.NOTES.SAVE')}
                            className="hover:no-underline"
                            isLoading={isCreating}
                            disabled={!message || isCreating}
                            onClick={() => void onAdd(message)}
                        />
                    </div>
                }
            />
            {isFetching ? (
                <div className="flex items-center justify-center py-10 text-n-slate-11">
                    <Loader />
                </div>
            ) : notes.length > 0 ? (
                <div>
                    {notes.map(note => (
                        <ContactNoteItem
                            key={note.id}
                            className="mx-6 py-4"
                            note={note}
                            writtenBy={getWrittenBy(note)}
                            allowDelete
                            onDelete={noteId => void onDelete(noteId)}
                        />
                    ))}
                </div>
            ) : (
                <p className="px-6 py-6 text-sm leading-6 text-center text-n-slate-11">
                    {t('CONTACTS_LAYOUT.SIDEBAR.NOTES.EMPTY_STATE')}
                </p>
            )}
        </div>
    );
}
