import { useWidgetState } from '../store/hooks';
import { t } from '../i18n';
import { CHAT_BUBBLE_ICON_PATH } from '../../sdk/constants/chatBubbleIcon';

// Màn trống của khung chat: thay màn chủ cũ, ô nhập nằm ngay bên dưới.
// Tiêu đề và lời giới thiệu lấy từ cấu hình hộp thư (hoặc mã nhúng), rỗng thì dùng câu mặc định.
export default function ChatEmptyState() {
    const websiteName = useWidgetState(state => state.channelConfig?.websiteName ?? '');
    const welcomeTitle = useWidgetState(
        state => state.appConfig.welcomeTitle || state.channelConfig?.welcomeTitle || '',
    );
    const welcomeTagline = useWidgetState(
        state => state.appConfig.welcomeDescription || state.channelConfig?.welcomeTagline || '',
    );
    // Chỉ hứa gửi được sticker khi hộp thư thật sự có kho sticker.
    const hasStickers = useWidgetState(state => state.messagingPolicy.stickers.length > 0);
    const defaultBody = hasStickers
        ? t('EMPTY_STATE.BODY', { name: websiteName })
        : t('EMPTY_STATE.BODY_WITHOUT_STICKER', { name: websiteName });

    return (
        <div
            className="flex flex-col items-center justify-center flex-1 gap-2 px-[34px] py-6 text-center"
            data-testid="chat-empty-state"
        >
            <span className="flex items-center justify-center mb-[3px] size-12 rounded-[14px] border border-[var(--yona-chat-line)] bg-[var(--yona-chat-panel)] text-[var(--yona-chat-accent)]">
                <svg
                    aria-hidden="true"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d={CHAT_BUBBLE_ICON_PATH} />
                </svg>
            </span>
            <h2 className="text-base font-semibold leading-[1.35] text-[var(--yona-chat-ink)]">
                {welcomeTitle || t('EMPTY_STATE.TITLE')}
            </h2>
            <p className="text-[13px] leading-[1.5] whitespace-pre-line text-[var(--yona-chat-ink-soft)]">
                {welcomeTagline || defaultBody}
            </p>
        </div>
    );
}
