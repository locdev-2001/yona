import { forwardRef, useState } from 'react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import { t } from '../../../i18n';
import { useConversation } from '../ConversationContext';
import type { ConversationMessage } from '../types';

const MAX_TARGETS = 20;

// Chuyển tiếp một tin tới các cuộc trò chuyện đang có trong danh sách.
const ForwardDialog = forwardRef<DialogHandle, { message: ConversationMessage | null }>(function ForwardDialog({ message }, ref) {
    const { conversations, forwardMessage } = useConversation();
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const targets = conversations.filter(chat => chat.can_reply && chat.member_status === 'active');

    const toggle = (chatId: number) =>
        setSelectedIds(current =>
            current.includes(chatId) ? current.filter(id => id !== chatId) : [...current, chatId].slice(0, MAX_TARGETS),
        );

    return (
        <Dialog
            ref={ref}
            title={t('CHAT.FORWARD.TITLE')}
            confirmButtonLabel={t('CHAT.FORWARD.SEND')}
            disableConfirmButton={!message || selectedIds.length === 0}
            width="md"
            overflowYAuto
            onClose={() => setSelectedIds([])}
            onConfirm={() => {
                if (!message) return;
                void forwardMessage(message, selectedIds);
                setSelectedIds([]);
                (ref as { current: DialogHandle | null } | null)?.current?.close();
            }}
        >
            <ul className="flex flex-col gap-0.5 m-0 p-0 list-none max-h-96 overflow-y-auto">
                {targets.map(chat => {
                    const isSelected = selectedIds.includes(chat.id);
                    const isGroup = chat.kind === 'group';
                    return (
                        <li key={chat.id}>
                            <button
                                type="button"
                                aria-pressed={isSelected}
                                className="flex items-center gap-3 w-full min-h-14 px-2 py-2 rounded-lg text-start hover:bg-n-surface-hover active:scale-[0.97]"
                                onClick={() => toggle(chat.id)}
                            >
                                <Avatar
                                    seed={isGroup ? avatarSeed('chat', chat.id) : avatarSeed('user', chat.meta.sender.id)}
                                    src={chat.meta.sender.thumbnail}
                                    name={chat.meta.sender.name ?? ''}
                                    size={36}
                                />
                                <span className="min-w-0 flex-1 truncate text-sm font-medium text-n-slate-12">{chat.meta.sender.name}</span>
                                <span
                                    className={`size-5 shrink-0 rounded-full border ${
                                        isSelected ? 'i-lucide-circle-check text-n-brand border-transparent' : 'border-n-slate-7'
                                    }`}
                                    aria-hidden="true"
                                />
                            </button>
                        </li>
                    );
                })}
            </ul>
        </Dialog>
    );
});

export default ForwardDialog;
