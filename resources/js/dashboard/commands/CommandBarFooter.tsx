import { t } from '../../i18n';

// Chân bảng lệnh. ninja-keys 1.2.3 vẽ sẵn một chân bảng tiếng Anh cứng
// (`src/ninja-footer.ts`) và không có thuộc tính đổi chuỗi; chỗ duy nhất thay được
// là <slot name="footer">. Vì vậy chân bảng dựng ở đây bằng light DOM, chuỗi lấy
// từ lang/{locale}/command_bar.php như mọi chỗ khác.

interface FooterHint {
    id: string;
    keyCaps: Array<{ icon?: string; text?: string }>;
    label: string;
}

function footerHints(): FooterHint[] {
    return [
        {
            id: 'select',
            keyCaps: [{ icon: 'i-lucide-corner-down-left' }],
            label: t('COMMAND_BAR.FOOTER.SELECT'),
        },
        {
            id: 'navigate',
            keyCaps: [{ icon: 'i-lucide-arrow-up' }, { icon: 'i-lucide-arrow-down' }],
            label: t('COMMAND_BAR.FOOTER.NAVIGATE'),
        },
        {
            id: 'close',
            keyCaps: [{ text: t('COMMAND_BAR.FOOTER.ESC_KEY') }],
            label: t('COMMAND_BAR.FOOTER.CLOSE'),
        },
        {
            id: 'parent',
            keyCaps: [{ icon: 'i-lucide-delete' }],
            label: t('COMMAND_BAR.FOOTER.MOVE_TO_PARENT'),
        },
    ];
}

export default function CommandBarFooter({ hasNoMatches }: { hasNoMatches: boolean }) {
    if (hasNoMatches) {
        return (
            <div slot="footer" className="command-bar-footer">
                <span className="command-bar-footer__empty">{t('COMMAND_BAR.NO_RESULTS')}</span>
            </div>
        );
    }

    return (
        <div slot="footer" className="command-bar-footer">
            {footerHints().map(hint => (
                <span key={hint.id} className="command-bar-footer__hint">
                    {hint.keyCaps.map(keyCap => (
                        <span
                            key={keyCap.icon ?? keyCap.text}
                            className={`command-bar-footer__key${keyCap.text ? ' command-bar-footer__key--text' : ''}`}
                        >
                            {keyCap.icon ? <span className={keyCap.icon} aria-hidden="true" /> : keyCap.text}
                        </span>
                    ))}
                    {hint.label}
                </span>
            ))}
        </div>
    );
}
