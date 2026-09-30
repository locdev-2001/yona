import { describe, expect, it } from 'vitest';

import { MESSAGE_TYPES } from 'dashboard/conversation/constants';
import { DEFAULT_AGENT_ALERT_PREFERENCE, agentAlertPreferenceOf, type AgentAlertPreference } from './preference';
import { MIN_ALERT_INTERVAL_MS, shouldPlayAlert, type AlertDecisionInput } from './shouldPlayAlert';

const ME = 7;
const COLLEAGUE = 9;
const NOW = 1_000_000;

const customerMessage = { message_type: MESSAGE_TYPES.INCOMING, private: false, conversation: { assignee_id: ME } };

const decide = (overrides: Partial<Omit<AlertDecisionInput, 'preference'>> & { preference?: Partial<AgentAlertPreference> }) =>
    shouldPlayAlert({
        message: customerMessage,
        currentUserId: ME,
        isTabActive: false,
        lastPlayedAt: null,
        now: NOW,
        ...overrides,
        preference: { ...DEFAULT_AGENT_ALERT_PREFERENCE, ...overrides.preference },
    });

describe('shouldPlayAlert', () => {
    it.each([
        ['tin khách gửi tới', {}, true],
        ['nhân viên tắt âm báo', { preference: { enabled: false } }, false],
        ['tin do chính mình/đồng nghiệp gửi', { message: { ...customerMessage, message_type: MESSAGE_TYPES.OUTGOING } }, false],
        ['ghi chú nội bộ', { message: { ...customerMessage, private: true } }, false],
        ['dòng hệ thống', { message: { ...customerMessage, message_type: MESSAGE_TYPES.ACTIVITY } }, false],
        ['tin mẫu do hệ thống gửi', { message: { ...customerMessage, message_type: MESSAGE_TYPES.TEMPLATE } }, false],
        [
            'hội thoại giao cho người khác, chế độ "chỉ của tôi"',
            { preference: { scope: 'assigned' }, message: { ...customerMessage, conversation: { assignee_id: COLLEAGUE } } },
            false,
        ],
        [
            'hội thoại chưa giao ai, chế độ "chỉ của tôi"',
            { preference: { scope: 'assigned' }, message: { ...customerMessage, conversation: { assignee_id: null } } },
            false,
        ],
        ['hội thoại giao cho tôi, chế độ "chỉ của tôi"', { preference: { scope: 'assigned' } }, true],
        [
            'hội thoại giao cho người khác, chế độ "mọi tin"',
            { message: { ...customerMessage, conversation: { assignee_id: COLLEAGUE } } },
            true,
        ],
        ['tab đang mở, chế độ "chỉ khi tab ẩn"', { preference: { only_when_hidden: true }, isTabActive: true }, false],
        ['tab ẩn, chế độ "chỉ khi tab ẩn"', { preference: { only_when_hidden: true }, isTabActive: false }, true],
        ['tab đang mở, chế độ thường', { isTabActive: true }, true],
        ['vừa kêu cách đây chưa đủ giãn cách', { lastPlayedAt: NOW - MIN_ALERT_INTERVAL_MS + 1 }, false],
        ['đã qua đủ giãn cách', { lastPlayedAt: NOW - MIN_ALERT_INTERVAL_MS }, true],
    ] as const)('%s → %s', (_case, overrides, expected) => {
        expect(decide(overrides as Parameters<typeof decide>[0])).toBe(expected);
    });
});

describe('agentAlertPreferenceOf', () => {
    it('chưa lưu gì thì bật, âm mặc định, mọi tin, không giới hạn tab', () => {
        expect(agentAlertPreferenceOf({})).toEqual(DEFAULT_AGENT_ALERT_PREFERENCE);
    });

    it('giá trị lạ trong ui_settings rơi về mặc định từng trường', () => {
        expect(
            agentAlertPreferenceOf({ notification_sound: { enabled: false, tone: 'coi-xe', scope: 'team', only_when_hidden: 'yes' } }),
        ).toEqual({ ...DEFAULT_AGENT_ALERT_PREFERENCE, enabled: false });
    });
});
