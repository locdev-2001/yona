import { describe, expect, it } from 'vitest';

import { autoResponderView } from './autoResponder';
import { matchesConversationView } from './realtimeReducers';
import type { Conversation } from './types';

const NOW = Date.parse('2026-10-15T07:00:00Z');
const LINH = { id: 9, name: 'Linh' };

describe('autoResponderView', () => {
    it.each([
        ['kênh chưa gắn AI', { enabled: false, ai_agent: null }, null, null, 'unassigned', null],
        ['AI của kênh đang tắt', { enabled: true, ai_agent: null }, { ...LINH, enabled: false }, null, 'agent_off', 'Linh'],
        ['công tắc tắt', { enabled: false, ai_agent: LINH }, { ...LINH, enabled: true }, null, 'off', 'Linh'],
        ['công tắc bật', { enabled: true, ai_agent: LINH }, { ...LINH, enabled: true }, null, 'on', 'Linh'],
        ['AI giữ lượt', { enabled: true, ai_agent: LINH }, { ...LINH, enabled: true }, '2026-10-15T07:00:30Z', 'replying', 'Linh'],
        ['lượt đã hết hạn', { enabled: true, ai_agent: LINH }, { ...LINH, enabled: true }, '2026-10-15T06:59:30Z', 'on', 'Linh'],
    ] as const)('%s', (_case, autoResponder, inboxAiAgent, floorHeldUntil, status, name) => {
        const view = autoResponderView({ auto_responder: autoResponder, floor_held_until: floorHeldUntil }, inboxAiAgent, NOW);

        expect(view.status).toBe(status);
        expect(view.aiAgentName).toBe(name);
    });
});

describe('bộ lọc nhanh AI trên danh sách', () => {
    const base = { assigneeTab: 'all' as const, status: 'all', inboxId: 0, teamId: 0, currentUserId: 1 };
    const conversation = (overrides: Partial<Conversation>) =>
        ({ id: 1, status: 'open', inbox_id: 1, labels: [], meta: { sender: { id: 1, name: 'A' }, channel: null }, ...overrides }) as Conversation;

    it('"AI tự động" chỉ giữ hội thoại bật công tắc, realtime tắt thì rời danh sách', () => {
        expect(matchesConversationView(conversation({ auto_responder: { enabled: true, ai_agent: LINH } }), { ...base, aiFilter: 'ai_auto_reply' })).toBe(true);
        expect(matchesConversationView(conversation({ auto_responder: { enabled: false, ai_agent: LINH } }), { ...base, aiFilter: 'ai_auto_reply' })).toBe(false);
    });

    it('"AI chuyển cho người" theo mốc ai_handed_off_at', () => {
        expect(matchesConversationView(conversation({ ai_handed_off_at: '2026-10-15T07:00:00Z' }), { ...base, aiFilter: 'ai_handed_off' })).toBe(true);
        expect(matchesConversationView(conversation({ ai_handed_off_at: null }), { ...base, aiFilter: 'ai_handed_off' })).toBe(false);
    });
});
