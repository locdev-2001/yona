import { useId } from 'react';
import { createPortal } from 'react-dom';

import { IFrameHelper } from '../helpers/iframe';
import { t } from '../i18n';
import { RESET_SESSION_EVENT } from '../../sdk/constants/frameEvents';

// Hỏi lại trước khi bỏ phiên hiện tại. Widget không tự xoá gì: SDK giữ đường xoá phiên duy nhất
// (cookie trang chủ + dựng lại iframe với cờ phiên mới), dùng chung với $yona.reset().
export default function ResetSessionDialog({ onClose }: { onClose: () => void }) {
    const titleId = useId();
    const bodyId = useId();

    const startNewSession = () => {
        onClose();
        IFrameHelper.sendMessage({ event: RESET_SESSION_EVENT });
    };

    // Vẽ ra body để hộp thoại phủ lên cả luồng tin lẫn ô nhập.
    return createPortal(
        <div
            className="fixed inset-0 z-50 bg-[var(--yona-chat-scrim-soft)]"
            onClick={onClose}
            onKeyDown={event => {
                if (event.key !== 'Escape') return;
                // Esc chỉ đóng hộp xác nhận, không lan lên khung chat (Esc ở đó đóng widget).
                event.stopPropagation();
                onClose();
            }}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={bodyId}
                className="absolute inset-x-3 bottom-3 overflow-hidden rounded-[16px] bg-[var(--yona-chat-panel)] shadow-[var(--yona-chat-shadow-pop)]"
                onClick={event => event.stopPropagation()}
            >
                <div className="px-4 pb-[14px] pt-4">
                    <h2 id={titleId} className="text-[15px] font-semibold leading-[1.35] text-[var(--yona-chat-ink)]">
                        {t('RESET_SESSION.CONFIRM_TITLE')}
                    </h2>
                    <p id={bodyId} className="mt-[5px] text-[12.5px] leading-[1.5] text-[var(--yona-chat-ink-soft)]">
                        {t('RESET_SESSION.CONFIRM_BODY')}
                    </p>
                </div>
                <div className="flex border-t border-[var(--yona-chat-line)]">
                    <button
                        type="button"
                        autoFocus
                        className="flex-1 min-h-11 border-e border-[var(--yona-chat-line)] p-[14px] text-[13.5px] font-semibold leading-none text-[var(--yona-chat-ink-soft)]"
                        onClick={onClose}
                    >
                        {t('RESET_SESSION.CANCEL')}
                    </button>
                    <button
                        type="button"
                        className="flex-1 min-h-11 p-[14px] text-[13.5px] font-semibold leading-none text-[var(--yona-chat-ink)]"
                        onClick={startNewSession}
                    >
                        {t('RESET_SESSION.CONFIRM')}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
