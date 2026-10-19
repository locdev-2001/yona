import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import { t } from '../../../i18n';
import CloseButton from 'dashboard/components-next/close-button/CloseButton';

// Cú bấm mở hồ sơ có thể rơi tiếp xuống nền mờ vừa hiện: bỏ qua trong khoảng này.
const BACKDROP_CLOSE_GRACE_MS = 600;

const isTypingTarget = (target: EventTarget | null) =>
    target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

interface ProfileWindowProps {
    label: string;
    card: ReactNode;
    tabs: ReactNode;
    children: ReactNode;
    onClose: () => void;
}

// Khung hồ sơ: cửa sổ nổi giữa màn trên máy tính (nền mờ, ✕, ESC để đóng), toàn màn
// trên điện thoại. Trái là thẻ người, phải là các tab.
export default function ProfileWindow({ label, card, tabs, children, onClose }: ProfileWindowProps) {
    const openedAt = useRef(Date.now());
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || isTypingTarget(event.target)) return;
            if (document.querySelector('dialog[open]')) return;
            onCloseRef.current();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    return (
        <div
            className="fixed inset-0 z-40 flex md:items-center md:justify-center md:p-8 md:bg-n-alpha-black1 md:backdrop-blur-[2px]"
            onClick={event => {
                if (event.target !== event.currentTarget) return;
                if (Date.now() - openedAt.current < BACKDROP_CLOSE_GRACE_MS) return;
                onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={label}
                className="relative flex flex-col md:flex-row w-full h-full min-w-0 overflow-y-auto md:overflow-hidden bg-n-surface-1 md:max-w-5xl md:max-h-[820px] md:rounded-2xl md:border md:border-n-weak md:shadow-2xl"
            >
                <CloseButton
                    label={t('FRIENDS.PROFILE.CLOSE')}
                    className="absolute top-3 end-3 z-10 max-md:size-9 max-md:rounded-full max-md:bg-n-alpha-black1 max-md:text-white"
                    onClick={onClose}
                />
                <aside className="shrink-0 md:w-[380px] md:m-4 md:me-0 md:overflow-y-auto md:overflow-x-hidden md:rounded-xl bg-n-surface-2">{card}</aside>
                <section className="flex flex-col flex-1 min-w-0 md:min-h-0">
                    <div className="shrink-0 px-4 md:px-6 pt-4 md:pt-6 md:pe-16">{tabs}</div>
                    <div className="flex-1 min-h-0 px-4 md:px-6 py-4 md:overflow-y-auto">{children}</div>
                </section>
            </div>
        </div>
    );
}
