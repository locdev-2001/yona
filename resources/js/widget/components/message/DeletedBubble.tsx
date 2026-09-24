import type { MessageGroupPosition } from 'shared/helpers/messageGrouping';

import { t } from '../../i18n';
import { bubbleRadius } from './bubbleShape';

// Tin đã thu hồi để lại vết cho cả hai bên: bong bóng nét đứt, chữ nghiêng.
export default function DeletedBubble({ isOwn, position }: { isOwn: boolean; position: MessageGroupPosition }) {
    return (
        <div
            className="yona-deleted-bubble border border-dashed border-[var(--yona-chat-line-strong)] px-[13px] py-[9px] text-[12.5px] italic leading-[1.4] text-[var(--yona-chat-ink-muted)]"
            style={bubbleRadius(isOwn, position)}
        >
            {t(isOwn ? 'RECALL.BY_YOU' : 'RECALL.BY_THEM')}
        </div>
    );
}
