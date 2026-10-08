import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatHeader } from './ChatHeader';
import HeaderActions from './HeaderActions';
import WidgetAvatar from './WidgetAvatar';
import { IFrameHelper } from '../helpers/iframe';
import { widgetStore } from '../store/widgetStore';
import { getActiveConversation, setActiveConversation } from '../api/client';
import { currentRoute, resetRouterForTests } from '../router';
import { decodeFrameMessage, RESET_SESSION_EVENT } from '../../sdk/constants/frameEvents';
import type { AvailableAgent, ChannelConfig, WidgetContact, WidgetMessage } from '../types';

const anyMessage = { id: 1, content: 'hello', message_type: 0, created_at: 1 } as unknown as WidgetMessage;
const agentRobert: AvailableAgent = { id: 7, name: 'Robert Nguyễn', avatar_url: '', availability_status: 'online' };

const messagesToParent: unknown[] = [];

const useChannel = (overrides: Partial<ChannelConfig> = {}) =>
    widgetStore.setChannelConfig(
        {
            websiteName: 'Yona',
            websiteToken: 'website-token',
            avatarUrl: '',
            replyTime: 'in_a_day',
            enabledFeatures: ['end_conversation'],
            workingHours: [],
            workingHoursEnabled: false,
            ...overrides,
        } as unknown as ChannelConfig,
        {},
        {} as WidgetContact,
    );

// Nạp đúng đường API mà widget dùng: danh sách nhân viên hộp thư, rồi bản tóm tắt hội thoại.
const loadConversation = async (summary: Record<string, unknown>, agents: AvailableAgent[] = [agentRobert]) => {
    vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response(JSON.stringify({ payload: agents })))
        .mockResolvedValueOnce(new Response(JSON.stringify(summary)));
    await act(() => widgetStore.fetchAvailableAgents());
    await act(() => widgetStore.getConversationAttributes());
};

// Như ViewWithHeader: header chỉ nhận những nhân viên đang trực tuyến.
const renderHeader = () =>
    render(
        <ChatHeader
            title="Yona"
            availableAgents={widgetStore.getState().agents.filter(agent => agent.availability_status === 'online')}
            onBack={() => undefined}
        />,
    );

const resetRequests = () =>
    messagesToParent.filter(message => decodeFrameMessage(message)?.event === RESET_SESSION_EVENT);

const openMenu = () => {
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));

    return screen.getByRole('menu');
};

beforeEach(() => {
    messagesToParent.length = 0;
    vi.spyOn(window.parent, 'postMessage').mockImplementation((message: unknown) => {
        messagesToParent.push(message);
    });
    widgetStore.clearConversations();
    widgetStore.clearConversationAttributes();
    widgetStore.setAppConfig({ enableEndConversation: true, availableMessage: '', unavailableMessage: '' });
    useChannel();
});

afterEach(() => vi.restoreAllMocks());

describe('header theo hộp thư hay theo nhân viên', () => {
    it('chưa ai nhận: tên hộp thư, trạng thái trực tuyến ghi thời gian trả lời đã cấu hình', async () => {
        await loadConversation({ id: 3, status: 'open', assignee: null });

        renderHeader();

        expect(screen.getByTestId('header-title').textContent).toBe('Yona');
        expect(screen.getByTestId('header-status').textContent).toBe('Typically replies in a day');
    });

    it('đã có nhân viên nhận: tên và avatar hình khối của nhân viên, đang hoạt động theo presence của người đó', async () => {
        await loadConversation({
            id: 3,
            status: 'open',
            assignee: { id: 7, name: 'Robert Nguyễn', avatar_url: '', availability_status: 'online' },
        });

        renderHeader();

        expect(screen.getByTestId('header-title').textContent).toBe('Robert Nguyễn');
        const headerAvatar = screen.getByTestId('header-avatar').querySelector('[data-generated-avatar]');
        const sameAgentElsewhere = render(<WidgetAvatar name="Robert" seed="user:7" size={34} />).container;
        expect(headerAvatar?.getAttribute('data-generated-avatar')).toBe('user:7');
        expect(sameAgentElsewhere.querySelector('[data-generated-avatar]')?.getAttribute('data-generated-avatar')).toBe(
            'user:7',
        );
        expect(screen.getByTestId('header-status').textContent).toBe('Active now');
    });

    it('nhân viên phụ trách không trực tuyến thì báo vắng mặt dù hộp thư còn người khác', async () => {
        const otherAgent = { ...agentRobert, id: 9, name: 'Lan' };
        await loadConversation(
            { id: 3, status: 'open', assignee: { id: 7, name: 'Robert Nguyễn', avatar_url: '', availability_status: 'offline' } },
            [{ ...agentRobert, availability_status: 'offline' }, otherAgent],
        );

        renderHeader();

        expect(screen.getByTestId('header-status').textContent).toBe('Away');
    });

    it('nhân viên phụ trách không là thành viên hộp thư vẫn hiện đang hoạt động theo trạng thái đi kèm hội thoại', async () => {
        await loadConversation(
            { id: 3, status: 'open', assignee: { id: 21, name: 'Minh Trần', avatar_url: '', availability_status: 'online' } },
            [],
        );

        renderHeader();

        expect(screen.getByTestId('header-title').textContent).toBe('Minh Trần');
        expect(screen.getByTestId('header-status').textContent).toBe('Active now');
    });

    it('presence của account đổi thì trạng thái nhân viên phụ trách đổi theo, không cần tải lại hội thoại', async () => {
        await loadConversation(
            { id: 3, status: 'open', assignee: { id: 21, name: 'Minh Trần', avatar_url: '', availability_status: 'online' } },
            [],
        );
        renderHeader();
        expect(screen.getByTestId('header-status').textContent).toBe('Active now');

        act(() => widgetStore.updateAgentsPresence({}));

        expect(screen.getByTestId('header-status').textContent).toBe('Away');
    });

    it('ngoài giờ làm việc của hộp thư thì nhân viên phụ trách cũng báo vắng mặt, khớp màn ngoài giờ', async () => {
        useChannel({
            workingHoursEnabled: true,
            timezone: 'UTC',
            workingHours: [0, 1, 2, 3, 4, 5, 6].map(dayOfWeek => ({ dayOfWeek, closedAllDay: true })),
        } as unknown as Partial<ChannelConfig>);
        await loadConversation({
            id: 3,
            status: 'open',
            assignee: { id: 7, name: 'Robert Nguyễn', avatar_url: '', availability_status: 'online' },
        });

        renderHeader();

        expect(screen.getByTestId('header-title').textContent).toBe('Robert Nguyễn');
        expect(screen.getByTestId('header-status').textContent).toBe('Away');
    });
});

describe('nút đóng', () => {
    it('hiện ở mọi khung khi widget nằm trong trang khách, bấm là xin SDK đóng khung chat', () => {
        vi.spyOn(IFrameHelper, 'isIFrame').mockReturnValue(true);

        render(<HeaderActions />);
        fireEvent.click(screen.getByRole('button', { name: 'Close chat window' }));

        expect(messagesToParent.map(message => decodeFrameMessage(message)?.event)).toContain('closeWindow');
    });

    it('cửa sổ bật riêng không có khung để đóng nên không có nút', () => {
        vi.spyOn(IFrameHelper, 'isIFrame').mockReturnValue(false);

        render(<HeaderActions showPopoutButton />);

        expect(screen.queryByRole('button', { name: 'Close chat window' })).toBeNull();
    });
});

describe('menu ⋯', () => {
    it('theo thứ tự design: hội thoại mới (giữ lịch sử), xoá phiên, rồi Kết thúc tách riêng bằng đường kẻ; header không còn icon rời', async () => {
        vi.spyOn(IFrameHelper, 'isIFrame').mockReturnValue(true);
        widgetStore.addOrUpdateMessage(anyMessage);
        await loadConversation({ id: 3, status: 'open' });

        render(<HeaderActions />);
        expect(screen.queryByRole('button', { name: 'Start over as a new visitor' })).toBeNull();

        const menu = openMenu();
        const items = within(menu).getAllByRole('menuitem').map(item => item.textContent);
        expect(items).toStrictEqual(['New conversation', 'Start over as a new visitor', 'End Conversation']);
        expect(within(menu).getAllByRole('separator')).toHaveLength(1);
    });

    it('Cuộc trò chuyện mới mở hội thoại trống, không xoá phiên khách', async () => {
        vi.spyOn(IFrameHelper, 'isIFrame').mockReturnValue(true);
        const post = vi.spyOn(window.parent, 'postMessage');
        resetRouterForTests();
        widgetStore.addOrUpdateMessage(anyMessage);
        await loadConversation({ id: 3, status: 'open' });

        render(<HeaderActions />);
        fireEvent.click(within(openMenu()).getByRole('menuitem', { name: 'New conversation' }));

        expect(getActiveConversation()).toBe('new');
        expect(currentRoute()).toBe('messages');
        const sent = post.mock.calls.map(([data]) => decodeFrameMessage(data)?.event);
        expect(sent).not.toContain(RESET_SESSION_EVENT);
        setActiveConversation(null);
    });

    it('khách chưa có tin nhắn và không kết thúc được thì không có menu', () => {
        vi.spyOn(IFrameHelper, 'isIFrame').mockReturnValue(true);

        render(<HeaderActions />);

        expect(screen.queryByRole('button', { name: 'More options' })).toBeNull();
    });

    it('Esc đóng menu mà không lan lên khung chat', () => {
        vi.spyOn(IFrameHelper, 'isIFrame').mockReturnValue(true);
        widgetStore.addOrUpdateMessage(anyMessage);
        const onWidgetKeyDown = vi.fn();

        render(
            <div onKeyDown={onWidgetKeyDown}>
                <HeaderActions />
            </div>,
        );
        fireEvent.keyDown(openMenu(), { key: 'Escape' });

        expect(screen.queryByRole('menu')).toBeNull();
        expect(onWidgetKeyDown).not.toHaveBeenCalled();
    });
});

describe('bắt đầu cuộc trò chuyện mới', () => {
    const openConfirmDialog = () => {
        vi.spyOn(IFrameHelper, 'isIFrame').mockReturnValue(true);
        widgetStore.addOrUpdateMessage(anyMessage);
        render(<HeaderActions />);
        fireEvent.click(within(openMenu()).getByRole('menuitem', { name: 'Start over as a new visitor' }));

        return screen.getByRole('alertdialog', { name: 'Start a new chat?' });
    };

    it('hỏi xác nhận trước, chưa xoá gì khi khách mới chọn mục trong menu', () => {
        openConfirmDialog();

        expect(resetRequests()).toHaveLength(0);
    });

    it('khách xác nhận thì xin SDK xoá phiên (cookie trang chủ và token widget tự lưu)', () => {
        openConfirmDialog();

        fireEvent.click(screen.getByRole('button', { name: 'Start over' }));

        expect(resetRequests()).toHaveLength(1);
        expect(screen.queryByRole('alertdialog')).toBeNull();
    });

    it('huỷ hoặc bấm Esc thì giữ nguyên phiên', () => {
        openConfirmDialog();
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(screen.queryByRole('alertdialog')).toBeNull();

        fireEvent.click(within(openMenu()).getByRole('menuitem', { name: 'Start over as a new visitor' }));
        fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
        expect(screen.queryByRole('alertdialog')).toBeNull();

        expect(resetRequests()).toHaveLength(0);
    });

    it('cửa sổ bật riêng không có SDK nào giữ cookie để xoá cùng nên không có mục này', () => {
        vi.spyOn(IFrameHelper, 'isIFrame').mockReturnValue(false);
        widgetStore.addOrUpdateMessage(anyMessage);

        render(<HeaderActions showPopoutButton />);

        expect(within(openMenu()).queryByRole('menuitem', { name: 'Start over as a new visitor' })).toBeNull();
    });
});
