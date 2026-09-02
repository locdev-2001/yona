import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { router, usePage } from '@inertiajs/react';

import Button from 'dashboard/components-next/button/Button';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import EmojiIconPicker from 'dashboard/components-next/emoji-icon-picker/EmojiIconPicker';
import type { PickerSelection } from 'dashboard/components-next/emoji-icon-picker/EmojiIconPicker';
import Popover from 'dashboard/components-next/popover/Popover';
import type { PopoverHandle } from 'dashboard/components-next/popover/Popover';
import Editor from 'dashboard/components/widgets/WootWriter/Editor';
import type { EditorHandle } from 'dashboard/components/widgets/WootWriter/Editor';
import { useAlert } from 'dashboard/composables/useAlert';
import { isEditorHotKeyEnabled } from 'dashboard/composables/useUISettings';
import type { UISettings } from 'dashboard/composables/useUISettings';
import { appendSignature, removeSignature } from 'dashboard/helper/editorHelper';
import { parseApiErrorMessage, postJson } from 'dashboard/helper/apiClient';
import { conversationUrl } from 'dashboard/helper/URLHelper';
import type { ContactMeta } from 'dashboard/conversation/types';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';

// Port từ components-next/NewConversation/ComposeConversation.vue +
// ComposeNewConversationForm/ContactSelector/InboxSelector/MessageEditor/
// ActionButtons — rút về trường hợp có contactId (mở từ ContactPanel): chip
// contact cố định, chọn inbox từ danh sách inbox share (contactable_inboxes
// chưa port — nhóm B), editor + emoji + chữ ký, Discard, Send THẬT qua
// POST /conversations {inbox_id, contact_id, message: {content}} (B3) rồi mở
// conversation. Bỏ: tìm/tạo contact (TagInput), Email/WhatsApp/Twilio options,
// đính kèm, copilot, phím tắt.
interface ComposeConversationProps {
    contact: ContactMeta;
    uiSettings: UISettings;
    onToggleSignature: () => void;
    onClose?: () => void;
    trigger: (context: { isOpen: boolean }) => ReactNode;
}

const CHANNEL_TYPE = 'Channel::Api';
const SIGNATURE_FLAG_KEY = 'channel_api_signature_enabled';

interface SidebarInbox {
    id: number;
    name: string;
    channel_type: string;
}

const contactLabel = (contact: ContactMeta): string => {
    if (contact.email) return `${contact.name} (${contact.email})`;
    if (contact.phone_number) return `${contact.name} (${contact.phone_number})`;
    return contact.name ?? '';
};

export default function ComposeConversation({ contact, uiSettings, onToggleSignature, onClose, trigger }: ComposeConversationProps) {
    const { auth, currentAccount, inboxes = [] } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const messageSignature = auth.user?.message_signature ?? '';
    const sendWithSignature = Boolean(uiSettings[SIGNATURE_FLAG_KEY]);

    const popoverRef = useRef<PopoverHandle>(null);
    const editorRef = useRef<EditorHandle>(null);
    const emojiButtonRef = useRef<HTMLDivElement>(null);
    const [targetInbox, setTargetInbox] = useState<SidebarInbox | null>(null);
    const [showInboxesDropdown, setShowInboxesDropdown] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [message, setMessage] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [showErrors, setShowErrors] = useState(false);

    const inboxMenuItems: DropdownMenuItem[] = inboxes.map(inbox => ({
        label: inbox.name,
        value: inbox.id,
        action: 'inbox',
    }));

    const isMessageEmpty = !message.trim().length;

    const clearForm = () => {
        setTargetInbox(null);
        setMessage('');
        setShowErrors(false);
        setShowInboxesDropdown(false);
    };

    const handleInboxAction = (item: DropdownMenuItem) => {
        const inbox = inboxes.find(candidate => candidate.id === item.value) ?? null;
        setTargetInbox(inbox);
        setShowInboxesDropdown(false);
        if (inbox && sendWithSignature && messageSignature) {
            setMessage(current => appendSignature(current, messageSignature, CHANNEL_TYPE));
        }
    };

    const toggleSignature = () => {
        if (messageSignature) {
            setMessage(current =>
                sendWithSignature
                    ? removeSignature(current, messageSignature, CHANNEL_TYPE)
                    : appendSignature(current, messageSignature, CHANNEL_TYPE),
            );
        }
        onToggleSignature();
    };

    const handleSendMessage = async (hide: () => void) => {
        setShowErrors(true);
        if (!targetInbox || isMessageEmpty) return;
        setIsCreating(true);
        try {
            const conversation = await postJson<{ id: number }>(`/api/v1/accounts/${accountId}/conversations`, {
                inbox_id: targetInbox.id,
                contact_id: contact.id,
                message: { content: message },
            });
            useAlert(t('COMPOSE_NEW_CONVERSATION.FORM.SUCCESS_MESSAGE'));
            clearForm();
            hide();
            router.visit(conversationUrl({ accountId, id: conversation.id }));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('COMPOSE_NEW_CONVERSATION.FORM.ERROR_MESSAGE'));
        } finally {
            setIsCreating(false);
        }
    };

    const sendButtonLabel = t('COMPOSE_NEW_CONVERSATION.FORM.ACTION_BUTTONS.SEND', {
        keyCode: isEditorHotKeyEnabled(uiSettings, 'cmd_enter') ? '⌘ + ↵' : '↵',
    });

    const handleEmojiSelect = (selection: PickerSelection) => {
        if (selection.type === 'emoji') editorRef.current?.insertText(selection.value);
        setShowEmojiPicker(false);
    };

    return (
        <Popover
            ref={popoverRef}
            align="end"
            showContentBorder={false}
            closeOnScroll={false}
            onHide={() => {
                clearForm();
                onClose?.();
            }}
            trigger={trigger}
            content={({ hide }) => (
                <div className="w-full md:w-[42rem] divide-y divide-n-strong overflow-visible transition-all duration-300 ease-in-out top-full flex flex-col bg-n-alpha-3 border border-n-strong shadow-sm backdrop-blur-[100px] rounded-xl min-w-0 max-h-[calc(100vh-8rem)]">
                    <div className="flex-1 overflow-y-auto divide-y divide-n-strong">
                        <div className="relative flex-1 px-4 py-3 overflow-y-visible">
                            <div className="flex items-baseline w-full gap-3 min-h-7">
                                <label className="text-sm font-medium text-n-slate-11 whitespace-nowrap">
                                    {t('COMPOSE_NEW_CONVERSATION.FORM.CONTACT_SELECTOR.LABEL')}
                                </label>
                                <div className="flex items-center gap-1.5 rounded-md bg-n-alpha-2 min-h-7 min-w-0 px-3">
                                    <span className="text-sm truncate text-n-slate-12">{contactLabel(contact)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center flex-1 w-full gap-3 px-4 py-3 overflow-y-visible">
                            <label className="mb-0.5 text-sm font-medium text-n-slate-11 whitespace-nowrap">
                                {t('COMPOSE_NEW_CONVERSATION.FORM.INBOX_SELECTOR.LABEL')}
                            </label>
                            {targetInbox ? (
                                <div className="flex items-center gap-1.5 rounded-md bg-n-alpha-2 truncate ltr:pl-3 rtl:pr-3 ltr:pr-1 rtl:pl-1 h-7 min-w-0">
                                    <span className="text-sm truncate text-n-slate-12">{targetInbox.name}</span>
                                    <Button
                                        variant="ghost"
                                        icon="i-lucide-x"
                                        color="slate"
                                        size="xs"
                                        className="flex-shrink-0"
                                        onClick={() => setTargetInbox(null)}
                                    />
                                </div>
                            ) : (
                                <div className="relative flex items-center h-7">
                                    <Button
                                        label={t('COMPOSE_NEW_CONVERSATION.FORM.INBOX_SELECTOR.BUTTON')}
                                        variant="link"
                                        size="sm"
                                        color={showErrors && !targetInbox ? 'ruby' : 'slate'}
                                        className="hover:!no-underline"
                                        onClick={() => setShowInboxesDropdown(open => !open)}
                                    />
                                    {inboxMenuItems.length > 0 && showInboxesDropdown ? (
                                        <DropdownMenu
                                            menuItems={inboxMenuItems}
                                            className="ltr:left-0 rtl:right-0 z-[100] top-8 max-h-56 w-fit max-w-sm dark:!outline-n-slate-5"
                                            onAction={handleInboxAction}
                                        />
                                    ) : null}
                                </div>
                            )}
                        </div>
                        <div className="px-4 py-3 h-full">
                            <Editor
                                ref={editorRef}
                                value={message}
                                editorId={`compose-${contact.id}`}
                                className={`[&>div]:!border-transparent [&>div]:px-0 [&>div]:py-0 [&>div]:!bg-transparent h-full [&_.ProseMirror-woot-style]:!max-h-[12.5rem] [&_.ProseMirror-woot-style]:!min-h-[12rem] [&_.ProseMirror-menubar]:!pt-0 ${
                                    showErrors && isMessageEmpty
                                        ? '[&_.empty-node]:before:!text-n-ruby-9 [&_.empty-node]:dark:before:!text-n-ruby-9'
                                        : ''
                                }`}
                                placeholder={t('COMPOSE_NEW_CONVERSATION.FORM.MESSAGE_EDITOR.PLACEHOLDER')}
                                channelType={CHANNEL_TYPE}
                                uiSettings={uiSettings}
                                onChange={setMessage}
                                onSend={() => void handleSendMessage(hide)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-between w-full h-[3.25rem] gap-2 px-4 py-3">
                        <div className="flex gap-2 items-center">
                            <div ref={emojiButtonRef} className="relative">
                                <Button
                                    icon="i-lucide-smile-plus"
                                    color="slate"
                                    size="sm"
                                    className="!w-10"
                                    onClick={() => setShowEmojiPicker(open => !open)}
                                />
                                {showEmojiPicker ? (
                                    <EmojiIconPicker
                                        mode="emoji"
                                        anchorRef={emojiButtonRef}
                                        onSelect={handleEmojiSelect}
                                        onClose={() => setShowEmojiPicker(false)}
                                    />
                                ) : null}
                            </div>
                            {targetInbox ? (
                                <Button icon="i-lucide-signature" color="slate" size="sm" className="!w-10" onClick={toggleSignature} />
                            ) : null}
                        </div>
                        <div className="flex gap-2 items-center">
                            <Button
                                label={t('COMPOSE_NEW_CONVERSATION.FORM.ACTION_BUTTONS.DISCARD')}
                                variant="faded"
                                color="slate"
                                size="sm"
                                className="!text-xs font-medium"
                                onClick={() => {
                                    clearForm();
                                    hide();
                                }}
                            />
                            <Button
                                label={sendButtonLabel}
                                size="sm"
                                className="!text-xs font-medium"
                                disabled={isCreating}
                                isLoading={isCreating}
                                onClick={() => void handleSendMessage(hide)}
                            />
                        </div>
                    </div>
                </div>
            )}
        />
    );
}
