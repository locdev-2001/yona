import { readGroupSender } from 'dashboard/components-next/message/helpers/groupSender';

import type { SearchMessage } from '../types';

// Tin nhóm: `sender` của tin là cả nhóm, người gửi thật nằm trong content_attributes.
export function searchAuthorName(message: SearchMessage): string {
    return readGroupSender(message.contentAttributes ?? {})?.name ?? message.sender?.name ?? '';
}
