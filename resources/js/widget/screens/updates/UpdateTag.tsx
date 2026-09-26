import type { WidgetUpdateItem } from '../../api/widget';
import { t } from '../../i18n';

const TONE: Record<WidgetUpdateItem['tag'], string> = {
    promo: 'bg-[var(--yona-chat-danger-bg)] text-[var(--yona-chat-danger)]',
    new: 'bg-[var(--yona-chat-positive-bg)] text-[var(--yona-chat-positive-ink)]',
    notice: 'bg-[var(--yona-chat-field)] text-[var(--yona-chat-ink-soft)]',
};

export default function UpdateTag({ tag }: { tag: WidgetUpdateItem['tag'] }) {
    return (
        <span className={`rounded-md px-2 py-0.5 text-[12px] font-medium ${TONE[tag] ?? TONE.notice}`}>
            {t(`UPDATES.TAG.${(TONE[tag] ? tag : 'notice').toUpperCase()}`)}
        </span>
    );
}
