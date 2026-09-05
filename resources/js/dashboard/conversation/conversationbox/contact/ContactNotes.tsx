import { useCallback, useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import Editor from 'dashboard/components-next/Editor/Editor';
import NextButton from 'dashboard/components-next/button/Button';
import Modal from 'dashboard/components/Modal';
import Spinner from 'dashboard/components-next/spinner/Spinner';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';

import { t } from '../../../../i18n';
import type { DashboardPageProps } from '../../../types';
import { useConversation } from '../../ConversationContext';
import { createContactNote, deleteContactNote, fetchContactNotes } from '../../panelApi';
import type { ContactNote } from '../../panelApi';
import ContactNoteItem from './ContactNoteItem';

// Port từ routes/dashboard/conversation/contact/ContactNotes.vue.
interface ContactNotesProps {
    contactId: number;
}

export default function ContactNotes({ contactId }: ContactNotesProps) {
    const { auth } = usePage<DashboardPageProps>().props;
    const { accountId, uiSettings } = useConversation();
    const [notes, setNotes] = useState<ContactNote[]>([]);
    const [isFetching, setIsFetching] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [noteContent, setNoteContent] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setShowCreateModal(false);
        setNoteContent('');
        setIsFetching(true);
        fetchContactNotes(accountId, contactId)
            .catch(() => [] as ContactNote[])
            .then(payload => {
                if (cancelled) return;
                setNotes(payload);
                setIsFetching(false);
            });

        return () => {
            cancelled = true;
        };
    }, [accountId, contactId]);

    const closeCreateModal = useCallback(() => {
        setShowCreateModal(false);
        setNoteContent('');
    }, []);

    const onAdd = useCallback(async () => {
        if (!contactId || !noteContent || isCreating) return;

        setIsCreating(true);
        try {
            const note = await createContactNote(accountId, contactId, noteContent);
            setNotes(current => [...current, note]);
            closeCreateModal();
        } finally {
            setIsCreating(false);
        }
    }, [accountId, contactId, noteContent, isCreating, closeCreateModal]);

    const onDelete = (noteId: number) => {
        if (!contactId || !noteId) return;
        void deleteContactNote(accountId, contactId, noteId).then(() =>
            setNotes(current => current.filter(note => note.id !== noteId)),
        );
    };

    useKeyboardEvents({ '$mod+Enter': { action: () => void onAdd(), allowOnFocusedInput: true } });

    const writtenBy = (note: ContactNote): string =>
        note.user?.id === auth.user?.id
            ? t('CONTACTS_LAYOUT.SIDEBAR.NOTES.YOU')
            : note.user?.name || t('CONVERSATION.BOT');

    return (
        <div>
            <div className="px-4 pt-3 pb-2">
                <NextButton
                    ghost
                    xs
                    icon="i-lucide-plus"
                    label={t('CONTACTS_LAYOUT.SIDEBAR.NOTES.ADD_NOTE')}
                    disabled={!contactId || isFetching}
                    onClick={() => {
                        if (!contactId) return;
                        setNoteContent('');
                        setShowCreateModal(true);
                    }}
                />
            </div>

            {isFetching ? (
                <div className="flex items-center justify-center py-8 text-n-slate-11">
                    <Spinner />
                </div>
            ) : notes.length ? (
                <div className="flex flex-col max-h-[300px] overflow-y-auto">
                    {notes.map(note => (
                        <ContactNoteItem
                            key={note.id}
                            className="py-4 last-of-type:border-b-0 px-4"
                            note={note}
                            writtenBy={writtenBy(note)}
                            allowDelete
                            collapsible
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            ) : (
                <p className="px-6 py-6 text-sm leading-6 text-center text-n-slate-11">
                    {t('CONTACTS_LAYOUT.SIDEBAR.NOTES.CONVERSATION_EMPTY_STATE')}
                </p>
            )}

            <Modal
                show={showCreateModal}
                onClose={closeCreateModal}
                closeOnBackdropClick={false}
                className="!items-start [&>div]:!top-12 [&>div]:sticky"
            >
                <div className="flex w-full flex-col gap-6 px-6 py-6">
                    <h3 className="text-lg font-semibold text-n-slate-12">
                        {t('CONTACTS_LAYOUT.SIDEBAR.NOTES.ADD_NOTE')}
                    </h3>
                    <Editor
                        value={noteContent}
                        onChange={setNoteContent}
                        uiSettings={uiSettings}
                        focusOnMount
                        placeholder={t('CONTACTS_LAYOUT.SIDEBAR.NOTES.PLACEHOLDER')}
                        className="[&>div]:!border-transparent [&>div]:px-4 [&>div]:py-4"
                    />
                    <div className="flex items-center justify-end gap-3">
                        <NextButton
                            solid
                            blue
                            label={t('CONTACTS_LAYOUT.SIDEBAR.NOTES.SAVE')}
                            isLoading={isCreating}
                            disabled={!noteContent || isCreating}
                            onClick={() => void onAdd()}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
