import { describe, expect, it } from 'vitest';

import { emptyListHint } from './emptyListHint';
import type { ConversationListMeta } from '../types';

const meta = (patch: Partial<ConversationListMeta> = {}): ConversationListMeta => ({
    mine_count: 0,
    assigned_count: 0,
    unassigned_count: 0,
    all_count: 0,
    ...patch,
});

describe('emptyListHint', () => {
    it('tab "Của tôi" rỗng nhưng còn hội thoại chưa gán → chỉ sang tab chưa gán', () => {
        expect(emptyListHint('me', meta({ unassigned_count: 3, all_count: 5 }), false)).toEqual({
            messageKey: 'CHAT_LIST.LIST.NONE_ASSIGNED_TO_ME',
            action: { tab: 'unassigned', labelKey: 'CHAT_LIST.LIST.VIEW_UNASSIGNED', count: 3 },
        });
    });

    it('tab "Của tôi" rỗng, không còn hội thoại chưa gán nhưng có hội thoại khác → chỉ sang tất cả', () => {
        expect(emptyListHint('me', meta({ all_count: 4 }), false)).toEqual({
            messageKey: 'CHAT_LIST.LIST.NONE_ASSIGNED_TO_ME',
            action: { tab: 'all', labelKey: 'CHAT_LIST.LIST.VIEW_ALL', count: 4 },
        });
    });

    it('tab "Chưa gán" rỗng nhưng có hội thoại khác → chỉ sang tất cả', () => {
        expect(emptyListHint('unassigned', meta({ all_count: 2 }), false)).toEqual({
            messageKey: 'CHAT_LIST.LIST.NONE_UNASSIGNED',
            action: { tab: 'all', labelKey: 'CHAT_LIST.LIST.VIEW_ALL', count: 2 },
        });
    });

    it('không còn hội thoại nào ở đâu cả → câu chung, không gợi ý đổi tab', () => {
        expect(emptyListHint('all', meta(), false)).toEqual({ messageKey: 'CHAT_LIST.LIST.404', action: null });
        expect(emptyListHint('me', meta(), false)).toEqual({ messageKey: 'CHAT_LIST.LIST.404', action: null });
    });

    it('đang áp bộ lọc nâng cao → không gợi ý đổi tab (tab đã bị ẩn)', () => {
        expect(emptyListHint('me', meta({ unassigned_count: 9 }), true)).toEqual({
            messageKey: 'CHAT_LIST.LIST.404',
            action: null,
        });
    });
});
