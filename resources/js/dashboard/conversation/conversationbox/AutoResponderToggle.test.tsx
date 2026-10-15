import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { setLocale, t } from '../../../i18n';
import { ApiError } from 'dashboard/helper/apiClient';
import type { Conversation } from '../types';

const { setAutoResponderSpy, alertSpy, visitSpy, state } = vi.hoisted(() => ({
    setAutoResponderSpy: vi.fn(),
    alertSpy: vi.fn(),
    visitSpy: vi.fn(),
    state: {
        conversation: null as Partial<Conversation> | null,
        inboxAiAgent: null as { id: number; name: string; enabled: boolean } | null,
        role: 'administrator' as 'administrator' | 'agent',
    },
}));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            inboxes: [{ id: 1, name: 'Shop chính', channel_type: 'Channel::Zalo', ai_agent: state.inboxAiAgent }],
            currentAccountUser: { role: state.role },
        },
    }),
    router: { visit: visitSpy },
}));
vi.mock('dashboard/composables/useAlert', () => ({ useAlert: alertSpy }));
vi.mock('../ConversationContext', () => ({
    useConversation: () => ({ accountId: 2, selectedConversation: state.conversation, setAutoResponder: setAutoResponderSpy }),
}));

import AutoResponderToggle from './AutoResponderToggle';

const LINH = { id: 9, name: 'Linh' };

const conversation = (overrides: Partial<Conversation>): Partial<Conversation> => ({
    id: 4,
    inbox_id: 1,
    auto_responder: { enabled: false, ai_agent: LINH },
    floor_held_until: null,
    ...overrides,
});

const theSwitch = () => screen.getByRole('switch');

beforeAll(() => setLocale('vi'));
afterAll(() => setLocale('en'));
beforeEach(() => {
    setAutoResponderSpy.mockReset().mockResolvedValue(undefined);
    alertSpy.mockReset();
    visitSpy.mockReset();
    state.inboxAiAgent = { ...LINH, enabled: true };
    state.role = 'administrator';
});

describe('công tắc "AI tự động"', () => {
    it('tắt: bấm là bật bằng AI của kênh', async () => {
        state.conversation = conversation({});
        render(<AutoResponderToggle />);

        expect(theSwitch()).toHaveAttribute('aria-checked', 'false');
        expect(theSwitch()).toHaveAccessibleName(t('CONVERSATION.AUTO_RESPONDER.TURN_ON'));
        await act(async () => {
            fireEvent.click(theSwitch());
        });

        expect(setAutoResponderSpy).toHaveBeenCalledWith(true);
    });

    it('bật: hiện tên AI của kênh, bấm là tắt', async () => {
        state.conversation = conversation({ auto_responder: { enabled: true, ai_agent: LINH } });
        render(<AutoResponderToggle />);

        expect(screen.getByText(t('CONVERSATION.AUTO_RESPONDER.LABEL_WITH_AGENT', { name: 'Linh' }))).toBeInTheDocument();
        await act(async () => {
            fireEvent.click(theSwitch());
        });

        expect(setAutoResponderSpy).toHaveBeenCalledWith(false);
    });

    it('AI đang giữ lượt: hiện "Linh đang trả lời…", vẫn tắt được', async () => {
        state.conversation = conversation({
            auto_responder: { enabled: true, ai_agent: LINH },
            floor_held_until: new Date(Date.now() + 60_000).toISOString(),
        });
        render(<AutoResponderToggle />);

        expect(screen.getByText(t('CONVERSATION.AUTO_RESPONDER.REPLYING', { name: 'Linh' }))).toBeInTheDocument();
        await act(async () => {
            fireEvent.click(theSwitch());
        });
        expect(setAutoResponderSpy).toHaveBeenCalledWith(false);
    });

    it('kênh chưa gắn AI: công tắc khoá, quản trị viên thấy liên kết gắn nhân viên AI', async () => {
        state.inboxAiAgent = null;
        state.conversation = conversation({ auto_responder: { enabled: false, ai_agent: null } });
        render(<AutoResponderToggle />);

        expect(theSwitch()).toHaveAttribute('aria-disabled', 'true');
        await act(async () => {
            fireEvent.click(theSwitch());
        });
        expect(setAutoResponderSpy).not.toHaveBeenCalled();
        expect(screen.getByRole('link', { name: t('CONVERSATION.AUTO_RESPONDER.ASSIGN_LINK') })).toHaveAttribute(
            'href',
            expect.stringContaining('/accounts/2/settings/ai-agents'),
        );
    });

    it('nhân viên thường không thấy liên kết gắn nhân viên AI', () => {
        state.inboxAiAgent = null;
        state.role = 'agent';
        state.conversation = conversation({ auto_responder: { enabled: false, ai_agent: null } });
        render(<AutoResponderToggle />);

        expect(screen.queryByRole('link')).toBeNull();
    });

    it('AI của kênh đang tắt mà công tắc bật: ghi rõ "(đang tắt)", vẫn tắt được công tắc', async () => {
        state.inboxAiAgent = { ...LINH, enabled: false };
        state.conversation = conversation({ auto_responder: { enabled: true, ai_agent: null } });
        render(<AutoResponderToggle />);

        expect(screen.getByText(t('CONVERSATION.AUTO_RESPONDER.LABEL_AGENT_OFF', { name: 'Linh' }))).toBeInTheDocument();
        await act(async () => {
            fireEvent.click(theSwitch());
        });
        expect(setAutoResponderSpy).toHaveBeenCalledWith(false);
    });

    it('máy chủ từ chối bật vì AI vừa bị gỡ: báo lý do kèm liên kết gắn AI', async () => {
        state.conversation = conversation({});
        setAutoResponderSpy.mockRejectedValue(new ApiError(422, { error: 'no_replying_ai_agent', message: 'x' }));
        render(<AutoResponderToggle />);

        await act(async () => {
            fireEvent.click(theSwitch());
        });

        expect(alertSpy).toHaveBeenCalledWith(
            t('CONVERSATION.AUTO_RESPONDER.ENABLE_UNAVAILABLE'),
            expect.objectContaining({ message: t('CONVERSATION.AUTO_RESPONDER.ASSIGN_LINK') }),
        );
        expect(theSwitch()).toHaveAttribute('aria-checked', 'false');
    });
});
