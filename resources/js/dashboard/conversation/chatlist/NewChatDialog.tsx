import { forwardRef, useState } from 'react';

import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import NextButton from 'dashboard/components-next/button/Button';
import { t } from '../../../i18n';
import { useConversation } from '../ConversationContext';
import PeoplePicker from '../group/PeoplePicker';
import type { PickedPerson } from '../group/PeoplePicker';

const MIN_GROUP_INVITEES = 2;

// Bắt đầu trò chuyện mới: chọn một người là mở hội thoại 1-1; chuyển sang "Tạo nhóm"
// thì đặt tên và chọn từ 2 người trở lên.
const NewChatDialog = forwardRef<DialogHandle>(function NewChatDialog(_props, ref) {
    const { openDirectChat, createGroup } = useConversation();
    const [isGroupMode, setGroupMode] = useState(false);
    const [title, setTitle] = useState('');
    const [picked, setPicked] = useState<PickedPerson[]>([]);
    const [isCreating, setCreating] = useState(false);

    const reset = () => {
        setGroupMode(false);
        setTitle('');
        setPicked([]);
        setCreating(false);
    };

    const canCreate = title.trim().length > 0 && picked.length >= MIN_GROUP_INVITEES && !isCreating;

    const submitGroup = async () => {
        if (!canCreate) return;
        setCreating(true);
        try {
            await createGroup({ title: title.trim(), userIds: picked.map(person => person.id) });
            reset();
        } catch {
            setCreating(false);
        }
    };

    return (
        <Dialog
            ref={ref}
            title={isGroupMode ? t('CHAT.GROUP.NEW') : t('CHAT.NEW.TITLE')}
            description={isGroupMode ? t('CHAT.GROUP.NEW_DESCRIPTION') : t('CHAT.NEW.DESCRIPTION')}
            showConfirmButton={isGroupMode}
            confirmButtonLabel={t('CHAT.GROUP.CREATE')}
            disableConfirmButton={!canCreate}
            isLoading={isCreating}
            onConfirm={() => void submitGroup()}
            onClose={reset}
        >
            {isGroupMode ? (
                <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-n-slate-12">{t('CHAT.GROUP.NAME')}</span>
                        <input
                            type="text"
                            value={title}
                            maxLength={100}
                            autoFocus
                            placeholder={t('CHAT.GROUP.NAME_PLACEHOLDER')}
                            className="field-surface h-11 px-2.5 rounded-lg text-[0.9375rem] text-n-slate-12 placeholder:text-n-slate-10 outline-none"
                            onChange={event => setTitle(event.target.value)}
                        />
                    </label>
                    <PeoplePicker selected={picked} onChange={setPicked} />
                </div>
            ) : (
                <>
                    <NextButton
                        ghost
                        slate
                        icon="i-lucide-users"
                        label={t('CHAT.GROUP.NEW')}
                        className="w-full justify-start mb-2 min-h-11"
                        onClick={() => setGroupMode(true)}
                    />
                    <PeoplePicker onPick={person => void openDirectChat(person.id)} />
                </>
            )}
        </Dialog>
    );
});

export default NewChatDialog;
