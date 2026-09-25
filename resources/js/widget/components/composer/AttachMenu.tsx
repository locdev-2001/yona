import { t } from '../../i18n';

interface AttachMenuProps {
    maximumFileSizeMb: number;
    onPickImages: () => void;
    onPickFiles: () => void;
    onClose: () => void;
}

// Menu "+" của ô nhập: popover hai mục trên lớp phủ nhạt (không làm mờ), nằm ngay
// trên ô nhập; bấm lớp phủ hoặc Esc để đóng.
export default function AttachMenu({ maximumFileSizeMb, onPickImages, onPickFiles, onClose }: AttachMenuProps) {
    const menuItems = [
        {
            key: 'image',
            icon: 'i-lucide-image',
            iconClass: 'bg-[var(--yona-chat-accent-soft)] text-[var(--yona-chat-accent)]',
            label: t('COMPOSER.ATTACH_IMAGE'),
            hint: t('COMPOSER.ATTACH_IMAGE_HINT'),
            onSelect: onPickImages,
        },
        {
            key: 'file',
            icon: 'i-lucide-file',
            iconClass: 'bg-[var(--yona-chat-field)] text-[var(--yona-chat-ink-soft)]',
            label: t('COMPOSER.ATTACH_FILE'),
            hint: t('COMPOSER.ATTACH_FILE_HINT', { size: `${maximumFileSizeMb} MB` }),
            onSelect: onPickFiles,
        },
    ];

    return (
        <>
            <div
                aria-hidden="true"
                data-testid="attach-menu-scrim"
                className="fixed inset-0 z-40 bg-[var(--yona-chat-scrim-faint)]"
                onClick={onClose}
            />
            <div
                role="menu"
                className="absolute bottom-full start-0 z-50 mb-5 w-56 overflow-hidden rounded-[14px] border border-[var(--yona-chat-line-card)] bg-[var(--yona-chat-panel)] shadow-[var(--yona-chat-shadow-menu)]"
                onKeyDown={event => {
                    if (event.key === 'Escape') {
                        event.stopPropagation();
                        onClose();
                    }
                }}
            >
                {menuItems.map(item => (
                    <button
                        key={item.key}
                        type="button"
                        role="menuitem"
                        className="flex items-center w-full gap-[11px] p-[13px] text-start min-h-11 border-t border-[var(--yona-chat-line)] first:border-t-0 hover:bg-[var(--yona-chat-hover)] active:scale-[0.97]"
                        onClick={() => {
                            onClose();
                            item.onSelect();
                        }}
                    >
                        <span className={`flex flex-none items-center justify-center rounded-[9px] size-8 ${item.iconClass}`}>
                            <span className={`${item.icon} size-4`} />
                        </span>
                        <span className="flex flex-col min-w-0 leading-[1.3]">
                            <span className="text-[13.5px] font-medium text-[var(--yona-chat-ink)]">{item.label}</span>
                            <span className="text-[11px] text-[var(--yona-chat-ink-muted)]">{item.hint}</span>
                        </span>
                    </button>
                ))}
            </div>
        </>
    );
}
