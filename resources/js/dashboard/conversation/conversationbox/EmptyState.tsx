import LoadingState from 'dashboard/components/widgets/LoadingState';
import { modifierKeyLabel } from 'shared/helpers/kbd';
import { t } from '../../../i18n';
import { useConversation } from '../ConversationContext';

function Hotkey({ children, customClass }: { children: string; customClass: string }) {
    return (
        <kbd
            className={`inline-flex leading-[0.625rem] rounded tracking-wide flex-shrink-0 items-center select-none justify-center p-0.5 min-w-[1rem] uppercase ${customClass}`}
        >
            {children}
        </kbd>
    );
}

function FeaturePlaceholder() {
    // Phím bổ trợ theo hệ điều hành của người dùng (⌘ trên mac, Ctrl trên Windows/Linux).
    const modifierKey = modifierKeyLabel();
    const keyShortcuts = [
        { key: 'K', description: t('CONVERSATION.EMPTY_STATE.CMD_BAR') },
        { key: '/', description: t('CONVERSATION.EMPTY_STATE.KEYBOARD_SHORTCUTS') },
    ];

    return (
        <div className="flex flex-col gap-2 mt-9">
            {keyShortcuts.map(keyShortcut => (
                <div key={keyShortcut.key} className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                        <Hotkey customClass="w-8 h-6 text-xs font-medium text-n-slate-12 bg-n-surface-field">{modifierKey}</Hotkey>
                        <Hotkey customClass="w-8 h-6 text-xs font-medium text-n-slate-12 bg-n-surface-field">{keyShortcut.key}</Hotkey>
                    </div>
                    <span className="text-sm font-medium text-center text-n-slate-12">{keyShortcut.description}</span>
                </div>
            ))}
        </div>
    );
}

export default function EmptyState() {
    const { conversations, listLoading } = useConversation();

    return (
        <div className="flex-1 min-w-0 px-0 flex flex-col items-center justify-center h-full bg-n-surface-1">
            {listLoading ? <LoadingState message={t('CONVERSATION.LOADING_CONVERSATIONS')} /> : null}
            {!listLoading ? (
                <div className="flex flex-col items-center justify-center h-full">
                    <img className="m-4 w-32 block" src="/assets/images/dashboard/no-chat.svg" alt="" />
                    <span className="text-sm text-n-slate-12 font-medium text-center">
                        {t(conversations.length ? 'CONVERSATION.SELECT_A_CONVERSATION' : 'CHAT.EMPTY.START')}
                    </span>
                    <FeaturePlaceholder />
                </div>
            ) : null}
        </div>
    );
}
