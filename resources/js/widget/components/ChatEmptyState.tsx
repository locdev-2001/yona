import { useWidgetState } from '../store/hooks';
import { t } from '../i18n';

// Màn trống của khung chat: thay màn chủ cũ, ô nhập nằm ngay bên dưới.
export default function ChatEmptyState() {
    const websiteName = useWidgetState(state => state.channelConfig?.websiteName ?? '');
    const welcomeTagline = useWidgetState(
        state => state.appConfig.welcomeDescription || state.channelConfig?.welcomeTagline || '',
    );

    return (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 px-8 py-10 text-center" data-testid="chat-empty-state">
            <span className="flex items-center justify-center size-12 rounded-[14px] bg-[var(--yona-chat-field)] text-[var(--yona-chat-accent)]">
                <span className="i-lucide-message-circle size-6" />
            </span>
            <h2 className="text-lg font-medium text-[var(--yona-chat-ink)]">{t('EMPTY_STATE.TITLE')}</h2>
            <p className="max-w-[280px] text-sm leading-5 text-[var(--yona-chat-ink-soft)]">
                {welcomeTagline || t('EMPTY_STATE.BODY', { name: websiteName })}
            </p>
        </div>
    );
}
