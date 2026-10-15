import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { setLocale, t } from '../../i18n';
import AiAgentsIndex from './Index';
import { personaPresetText } from './personaPresets';
import type { AiAgent, AiAgentInbox } from './types';

const api = vi.hoisted(() => ({
    fetchAiAgents: vi.fn(),
    createAiAgent: vi.fn(),
    updateAiAgent: vi.fn(),
    setAiAgentEnabled: vi.fn(),
    deleteAiAgent: vi.fn(),
    uploadAiAgentAvatar: vi.fn(),
    removeAiAgentAvatar: vi.fn(),
    assignInboxAiAgent: vi.fn(),
}));
const alertSpy = vi.hoisted(() => vi.fn());

vi.mock('./aiAgentsApi', () => api);
vi.mock('dashboard/composables/useAlert', () => ({ useAlert: alertSpy }));
vi.mock('@inertiajs/react', () => ({ usePage: () => ({ props: { currentAccount: { id: 7 } } }) }));
vi.mock('../Dashboard', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../settings/SettingsWrapper', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../settings/BaseSettingsHeader', () => ({
    default: ({ title, actions }: { title: string; actions?: ReactNode }) => (
        <header>
            <h1>{title}</h1>
            {actions}
        </header>
    ),
}));

const ZALO = { key: 'zalo', name: 'Zalo cá nhân', logo_url: '/brand-assets/platforms/zalo.webp' };
const EMAIL = { key: 'email', name: 'Email', logo_url: '/brand-assets/platforms/email.webp' };

const linh = (overrides: Partial<AiAgent> = {}): AiAgent => ({
    id: 1,
    name: 'Linh',
    persona: null,
    instructions: null,
    enabled: true,
    avatar_url: '',
    inbox_ids: [10],
    auto_reply_conversations_count: 3,
    ...overrides,
});
const minh = (overrides: Partial<AiAgent> = {}): AiAgent => ({ ...linh(), id: 2, name: 'Minh', inbox_ids: [11], ...overrides });
const inbox = (overrides: Partial<AiAgentInbox>): AiAgentInbox => ({
    id: 10,
    name: 'Shop chính',
    channel_type: 'Channel::ZaloPersonal',
    platform: ZALO,
    ai_agent_id: 1,
    auto_reply_conversations_count: 0,
    ...overrides,
});

const channelSelect = (name: string) =>
    screen.getByLabelText(t('AI_AGENTS.CHANNELS.SELECT_LABEL', { name })) as HTMLSelectElement;

beforeAll(() => {
    setLocale('vi');
    HTMLDialogElement.prototype.showModal = function showModal() {
        this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function close() {
        this.removeAttribute('open');
    };
});
afterAll(() => setLocale('en'));
beforeEach(() => {
    Object.values(api).forEach(spy => spy.mockReset());
    alertSpy.mockReset();
    api.assignInboxAiAgent.mockImplementation((_account: number, inboxId: number, aiAgentId: number | null) =>
        Promise.resolve({ id: inboxId, ai_agent_id: aiAgentId }),
    );
});

async function renderWith(aiAgents: AiAgent[], inboxes: AiAgentInbox[]) {
    api.fetchAiAgents.mockResolvedValue({ payload: aiAgents, inboxes });
    render(<AiAgentsIndex />);
    await screen.findByText(t('AI_AGENTS.CHANNELS.TITLE'));
}

describe('Cài đặt › Nhân viên AI', () => {
    it('chưa có AI thì hiện trạng thái rỗng, nút tạo mở ngăn tạo', async () => {
        api.fetchAiAgents.mockResolvedValue({ payload: [], inboxes: [inbox({ ai_agent_id: null })] });
        render(<AiAgentsIndex />);

        fireEvent.click(await screen.findByRole('button', { name: t('AI_AGENTS.EMPTY.ACTION') }));

        expect(screen.getByRole('dialog', { name: t('AI_AGENTS.FORM.CREATE_TITLE') })).toBeInTheDocument();
    });

    it('thẻ AI hiện kênh đang gắn bằng logo + tên, không hiện số kênh', async () => {
        await renderWith([linh({ inbox_ids: [10, 12] })], [inbox({}), inbox({ id: 12, name: 'Widget website', platform: null, channel_type: 'Channel::WebWidget' })]);

        const card = screen.getByTestId('ai-agent-card');
        const channels = within(card).getByRole('list', { name: t('AI_AGENTS.CARD.CHANNELS') });

        expect(within(channels).getAllByRole('listitem').map(item => item.textContent)).toEqual(['Shop chính', 'Widget website']);
        expect(card.textContent).not.toMatch(/2 kênh/);
    });
});

describe('bảng AI của từng kênh', () => {
    it('kênh không có hội thoại tự động: chọn AI khác là lưu ngay, không hỏi', async () => {
        await renderWith([linh(), minh()], [inbox({ auto_reply_conversations_count: 0 }), inbox({ id: 11, name: 'Hỗ trợ', platform: EMAIL, ai_agent_id: 2 })]);

        fireEvent.change(channelSelect('Shop chính'), { target: { value: '2' } });

        await waitFor(() => expect(api.assignInboxAiAgent).toHaveBeenCalledWith(7, 10, 2));
        expect(document.querySelector('dialog[open]')).toBeNull();
        await waitFor(() => expect(channelSelect('Shop chính').value).toBe('2'));
    });

    it('kênh đang có hội thoại tự động: hỏi xác nhận một lần, "Giữ" thì không lưu', async () => {
        await renderWith([linh(), minh()], [inbox({ auto_reply_conversations_count: 4 }), inbox({ id: 11, name: 'Hỗ trợ', ai_agent_id: 2 })]);

        fireEvent.change(channelSelect('Shop chính'), { target: { value: '2' } });

        const dialog = document.querySelector('dialog[open]') as HTMLDialogElement;
        expect(within(dialog).getByText(t('AI_AGENTS.REPLACE.TITLE', { old: 'Linh', new: 'Minh', channel: 'Shop chính' }))).toBeInTheDocument();

        fireEvent.click(within(dialog).getByRole('button', { name: t('AI_AGENTS.REPLACE.KEEP', { old: 'Linh' }) }));

        expect(api.assignInboxAiAgent).not.toHaveBeenCalled();
        expect(channelSelect('Shop chính').value).toBe('1');
    });

    it('xác nhận thay thì lưu, chọn "Không dùng AI" cũng hỏi khi có hội thoại tự động', async () => {
        await renderWith([linh(), minh()], [inbox({ auto_reply_conversations_count: 4 }), inbox({ id: 11, name: 'Hỗ trợ', ai_agent_id: 2 })]);

        fireEvent.change(channelSelect('Shop chính'), { target: { value: '2' } });
        await act(async () => {
            fireEvent.submit(document.querySelector('dialog[open] form') as HTMLFormElement);
        });
        await waitFor(() => expect(api.assignInboxAiAgent).toHaveBeenCalledWith(7, 10, 2));

        fireEvent.change(channelSelect('Shop chính'), { target: { value: 'none' } });
        const dialog = document.querySelector('dialog[open]') as HTMLDialogElement;
        expect(within(dialog).getByText(t('AI_AGENTS.REMOVE.TITLE', { old: 'Minh', channel: 'Shop chính' }))).toBeInTheDocument();
    });
});

describe('ngăn tạo nhân viên AI', () => {
    it('mẫu persona điền sẵn, chọn kênh của AI khác phải xác nhận, "Tạo và bật" gửi đủ dữ liệu', async () => {
        await renderWith([minh({ inbox_ids: [11] })], [inbox({ ai_agent_id: null }), inbox({ id: 11, name: 'Hỗ trợ', platform: EMAIL, ai_agent_id: 2 })]);
        api.createAiAgent.mockResolvedValue(linh({ inbox_ids: [10, 11], persona: personaPresetText('PROFESSIONAL') }));

        fireEvent.click(screen.getAllByRole('button', { name: t('AI_AGENTS.ADD') })[0]);
        const form = screen.getByTestId('ai-agent-form');

        fireEvent.change(within(form).getByLabelText(t('AI_AGENTS.FORM.NAME')), { target: { value: 'Linh' } });
        fireEvent.click(within(form).getByRole('button', { name: t('AI_AGENTS.PRESETS.PROFESSIONAL.LABEL') }));
        expect((within(form).getByLabelText(t('AI_AGENTS.FORM.PERSONA_CONTENT')) as HTMLTextAreaElement).value).toBe(
            personaPresetText('PROFESSIONAL'),
        );

        fireEvent.click(within(form).getByRole('button', { name: /Shop chính/ }));
        fireEvent.click(within(form).getByRole('button', { name: /Hỗ trợ/ }));
        await act(async () => {
            fireEvent.submit(document.querySelector('dialog[open] form') as HTMLFormElement);
        });
        expect(within(form).getByRole('button', { name: /Hỗ trợ/ })).toHaveAttribute('aria-pressed', 'true');

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: t('AI_AGENTS.FORM.CREATE') }));
        });

        expect(api.createAiAgent).toHaveBeenCalledWith(7, {
            name: 'Linh',
            persona: personaPresetText('PROFESSIONAL'),
            instructions: '',
            inbox_ids: [10, 11],
        });
        expect(alertSpy).toHaveBeenCalledWith(t('AI_AGENTS.FORM.CREATED', { name: 'Linh' }));
        await waitFor(() => expect(channelSelect('Hỗ trợ').value).toBe('1'));
    });

    it('tên trống thì không gửi, báo lỗi ngay tại ô tên', async () => {
        await renderWith([linh()], [inbox({})]);

        fireEvent.click(screen.getAllByRole('button', { name: t('AI_AGENTS.ADD') })[0]);
        fireEvent.click(screen.getByRole('button', { name: t('AI_AGENTS.FORM.CREATE') }));

        expect(api.createAiAgent).not.toHaveBeenCalled();
        expect(screen.getByText(t('AI_AGENTS.FORM.NAME_REQUIRED'))).toBeInTheDocument();
    });
});
