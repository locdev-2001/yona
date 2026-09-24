import { t } from '../../i18n';

interface AttachMenuProps {
    maximumFileSizeMb: number;
    onPickImages: () => void;
    onPickFiles: () => void;
    onClose: () => void;
}

// Menu "+" của ô nhập: popover hai mục trên lớp phủ mờ; bấm lớp phủ hoặc Esc để đóng.
export default function AttachMenu({ maximumFileSizeMb, onPickImages, onPickFiles, onClose }: AttachMenuProps) {
    const menuItems = [
        {
            key: 'image',
            icon: 'i-lucide-image',
            label: t('COMPOSER.ATTACH_IMAGE'),
            hint: t('COMPOSER.ATTACH_IMAGE_HINT'),
            onSelect: onPickImages,
        },
        {
            key: 'file',
            icon: 'i-lucide-paperclip',
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
                className="fixed inset-0 z-40 bg-[var(--yona-chat-scrim-soft)] backdrop-blur-[2px]"
                onClick={onClose}
            />
            <div
                role="menu"
                className="absolute bottom-full start-0 z-50 mb-2 w-56 overflow-hidden rounded-2xl bg-[var(--yona-chat-panel)] p-1.5 shadow-[var(--yona-chat-shadow-pop)]"
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
                        className="flex items-center w-full gap-3 px-2.5 py-2 text-start rounded-xl min-h-11 hover:bg-[var(--yona-chat-field)]"
                        onClick={() => {
                            onClose();
                            item.onSelect();
                        }}
                    >
                        <span className="flex items-center justify-center rounded-full size-9 bg-[var(--yona-chat-field)] text-[var(--yona-chat-accent)]">
                            <span className={`${item.icon} size-[18px]`} />
                        </span>
                        <span className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-[var(--yona-chat-ink)]">{item.label}</span>
                            <span className="text-xs text-[var(--yona-chat-ink-muted)]">{item.hint}</span>
                        </span>
                    </button>
                ))}
            </div>
        </>
    );
}
