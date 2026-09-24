import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import HeaderActions from './HeaderActions';
import ResetSessionButton from './ResetSessionButton';
import { IFrameHelper } from '../helpers/iframe';
import { widgetStore } from '../store/widgetStore';
import { FRAME_MESSAGE_PREFIX, RESET_SESSION_EVENT } from '../../sdk/constants/frameEvents';
import type { WidgetMessage } from '../types';

const RESET_MESSAGE = `${FRAME_MESSAGE_PREFIX}${JSON.stringify({ event: RESET_SESSION_EVENT })}`;
const anyMessage = { id: 1, content: 'hello', message_type: 0, created_at: 1 } as unknown as WidgetMessage;

const messagesToParent: unknown[] = [];

beforeEach(() => {
    messagesToParent.length = 0;
    vi.spyOn(window.parent, 'postMessage').mockImplementation((message: unknown) => {
        messagesToParent.push(message);
    });
    widgetStore.clearConversations();
});

afterEach(() => vi.restoreAllMocks());

const openConfirmDialog = () => {
    render(<ResetSessionButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Start a new chat' }));

    return screen.getByRole('alertdialog', { name: 'Start a new chat?' });
};

const resetRequests = () => messagesToParent.filter(message => message === RESET_MESSAGE);

describe('nút bắt đầu cuộc trò chuyện mới', () => {
    it('hỏi xác nhận trước, chưa xoá gì khi khách mới bấm nút', () => {
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

        fireEvent.click(screen.getByRole('button', { name: 'Start a new chat' }));
        fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
        expect(screen.queryByRole('alertdialog')).toBeNull();

        expect(resetRequests()).toHaveLength(0);
    });
});

describe('vị trí nút trong header', () => {
    it('hiện khi widget nằm trong trang khách và khách đã có tin nhắn', () => {
        vi.spyOn(IFrameHelper, 'isIFrame').mockReturnValue(true);
        widgetStore.addOrUpdateMessage(anyMessage);

        render(<HeaderActions />);

        expect(screen.getByRole('button', { name: 'Start a new chat' })).toBeInTheDocument();
    });

    it('ẩn khi khách chưa có tin nhắn nào', () => {
        vi.spyOn(IFrameHelper, 'isIFrame').mockReturnValue(true);

        render(<HeaderActions />);

        expect(screen.queryByRole('button', { name: 'Start a new chat' })).toBeNull();
    });

    it('ẩn ở cửa sổ bật riêng: không có SDK nào giữ cookie để xoá cùng', () => {
        vi.spyOn(IFrameHelper, 'isIFrame').mockReturnValue(false);
        widgetStore.addOrUpdateMessage(anyMessage);

        render(<HeaderActions showPopoutButton />);

        expect(screen.queryByRole('button', { name: 'Start a new chat' })).toBeNull();
    });
});
