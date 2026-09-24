import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchTargetsSpy, forwardSpy, alertSpy, visitSpy } = vi.hoisted(() => ({
    fetchTargetsSpy: vi.fn(),
    forwardSpy: vi.fn(),
    alertSpy: vi.fn(),
    visitSpy: vi.fn(),
}));

vi.mock('../forwardApi', () => ({ fetchForwardTargets: fetchTargetsSpy, forwardMessage: forwardSpy }));
vi.mock('dashboard/composables/useAlert', () => ({ useAlert: alertSpy }));
vi.mock('@inertiajs/react', () => ({ router: { visit: visitSpy } }));

import { ApiError } from 'dashboard/helper/apiClient';
import { t } from '../../../i18n';
import type { ForwardTarget } from '../forwardApi';
import type { ConversationMessage } from '../types';
import ForwardMessageDialog from './ForwardMessageDialog';

const SOURCE: ConversationMessage = {
    id: 9,
    content: 'Còn size M không shop?',
    inbox_id: 3,
    conversation_id: 4,
    message_type: 0,
    content_type: 'text',
    status: 'sent',
    content_attributes: {},
    created_at: 1756707112,
    private: false,
    source_id: null,
};

function target(id: number, name: string, overrides: Partial<ForwardTarget> = {}): ForwardTarget {
    return {
        id,
        status: 'open',
        last_activity_at: 1756707112,
        inbox: { id: 3, name: 'Zalo Shop', channel_type: 'Channel::Zalo' },
        contact: { id: id + 100, name, thumbnail: '' },
        forwardable: true,
        code: null,
        reason: null,
        missing_capabilities: [],
        ...overrides,
    };
}

const LAN = target(45, 'Chị Lan');
const BINH = target(46, 'Anh Bình');
const SMS = target(47, 'Cô Hoa', {
    inbox: { id: 5, name: 'SMS Shop', channel_type: 'Channel::Sms' },
    forwardable: false,
    code: 'capability_not_supported',
    reason: 'Hộp thư SMS Shop không gửi được ảnh.',
    missing_capabilities: ['outbound_image'],
});

function renderDialog() {
    const onClose = vi.fn();
    render(<ForwardMessageDialog accountId={1} conversationId={4} message={SOURCE} onClose={onClose} />);

    return { onClose };
}

const row = (id: number) => screen.getByTestId(`forward-target-${id}`);
const rowCheckbox = (id: number) => within(row(id)).getByRole('checkbox') as HTMLInputElement;
const confirmButton = (count: number) => screen.getByRole('button', { name: t('CONVERSATION.FORWARD.SUBMIT_COUNT', { count }) });
const submitDialog = () => fireEvent.submit(document.querySelector('dialog form') as HTMLFormElement);

beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal() {
        this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function close() {
        this.removeAttribute('open');
    };
});

beforeEach(() => {
    fetchTargetsSpy.mockReset().mockResolvedValue({ max_targets: 10, payload: [LAN, BINH, SMS] });
    forwardSpy.mockReset();
    alertSpy.mockReset();
    visitSpy.mockReset();
});

describe('ForwardMessageDialog', () => {
    it('hiện xem trước tin đang chuyển tiếp và danh sách hội thoại gần đây', async () => {
        renderDialog();

        expect(confirmButton(0).hasAttribute('disabled')).toBe(true);
        expect(screen.getByTestId('forward-preview').textContent).toContain('Còn size M không shop?');
        expect(screen.getByText(t('CONVERSATION.FORWARD.RECENT'))).not.toBeNull();
        await waitFor(() => expect(row(45).textContent).toContain('Chị Lan'));
        expect(row(45).textContent).toContain('Zalo Shop');
        expect(row(45).textContent).toContain('#45');
        expect(fetchTargetsSpy).toHaveBeenCalledWith(1, 4, 9, '');
    });

    it('hộp thư đích có nền tảng thì dòng hiện logo nền tảng, không có thì icon theo loại kênh', async () => {
        const zaloPlatform = { key: 'zalo', name: 'Zalo', logo_url: '/brand-assets/platforms/zalo.svg' };
        fetchTargetsSpy.mockResolvedValue({
            max_targets: 10,
            payload: [target(45, 'Chị Lan', { inbox: { ...LAN.inbox, platform: zaloPlatform } }), BINH],
        });
        renderDialog();

        await waitFor(() => expect(row(45)).not.toBeNull());
        expect(row(45).querySelector('img[data-platform="zalo"]')?.getAttribute('src')).toBe(zaloPlatform.logo_url);
        expect(row(46).querySelector('img[data-platform]')).toBeNull();
    });

    it('dòng không nhận được: checkbox tắt, hiện lý do của máy chủ', async () => {
        renderDialog();

        await waitFor(() => expect(row(47)).not.toBeNull());
        expect(rowCheckbox(47).disabled).toBe(true);
        expect(row(47).textContent).toContain('Hộp thư SMS Shop không gửi được ảnh.');
        expect(row(47).className).toContain('opacity-60');
    });

    it('chọn đủ giới hạn thì các dòng còn lại bị khoá, rê chuột thấy lý do', async () => {
        fetchTargetsSpy.mockResolvedValue({ max_targets: 2, payload: [LAN, BINH, target(48, 'Chú Tư')] });
        renderDialog();

        await waitFor(() => expect(row(48)).not.toBeNull());
        fireEvent.click(rowCheckbox(45));
        fireEvent.click(rowCheckbox(46));

        expect(rowCheckbox(48).disabled).toBe(true);
        expect(row(48).getAttribute('title')).toBe(t('CONVERSATION.FORWARD.MAX_REACHED', { max: 2 }));
        expect(confirmButton(2).hasAttribute('disabled')).toBe(false);
    });

    it('lựa chọn còn nguyên khi đổi từ khoá; bấm × trên chip thì bỏ chọn', async () => {
        renderDialog();
        await waitFor(() => expect(row(45)).not.toBeNull());
        fireEvent.click(rowCheckbox(45));

        fetchTargetsSpy.mockResolvedValue({ max_targets: 10, payload: [BINH] });
        fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Bình' } });
        await waitFor(() => expect(fetchTargetsSpy).toHaveBeenLastCalledWith(1, 4, 9, 'Bình'));
        await waitFor(() => expect(screen.queryByTestId('forward-target-45')).toBeNull());

        const chips = screen.getByTestId('forward-selected');
        expect(chips.textContent).toContain('Chị Lan');

        fireEvent.click(within(chips).getByRole('button', { name: t('CONVERSATION.FORWARD.REMOVE_TARGET', { name: 'Chị Lan' }) }));

        expect(screen.queryByTestId('forward-selected')).toBeNull();
    });

    it('Enter trong ô tìm không gửi chuyển tiếp', async () => {
        renderDialog();
        await waitFor(() => expect(row(45)).not.toBeNull());
        fireEvent.click(rowCheckbox(45));

        const searchBox = screen.getByRole('searchbox');
        const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
        searchBox.dispatchEvent(enter);

        expect(enter.defaultPrevented).toBe(true);
        expect(forwardSpy).not.toHaveBeenCalled();
    });

    it('gửi đúng các hội thoại đã chọn; thành công thì đóng hộp, toast có nút mở hội thoại khi chỉ một đích', async () => {
        forwardSpy.mockResolvedValue([{ conversation_id: 45, ok: true }]);
        const { onClose } = renderDialog();
        await waitFor(() => expect(row(45)).not.toBeNull());
        fireEvent.click(rowCheckbox(45));

        await act(async () => submitDialog());

        expect(forwardSpy).toHaveBeenCalledWith(1, 4, 9, [45]);
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(alertSpy).toHaveBeenCalledWith(
            t('CONVERSATION.FORWARD.SUCCESS', { count: 1 }),
            expect.objectContaining({ message: t('CONVERSATION.FORWARD.OPEN') }),
        );

        alertSpy.mock.calls[0][1].onClick();
        expect(visitSpy).toHaveBeenCalledWith('/app/accounts/1/conversations/45');
    });

    it('nhiều đích: gửi theo thứ tự chọn, toast không kèm nút mở', async () => {
        forwardSpy.mockResolvedValue([
            { conversation_id: 45, ok: true },
            { conversation_id: 46, ok: true },
        ]);
        renderDialog();
        await waitFor(() => expect(row(46)).not.toBeNull());
        fireEvent.click(rowCheckbox(45));
        fireEvent.click(rowCheckbox(46));

        await act(async () => submitDialog());

        expect(forwardSpy).toHaveBeenCalledWith(1, 4, 9, [45, 46]);
        expect(alertSpy).toHaveBeenCalledWith(t('CONVERSATION.FORWARD.SUCCESS', { count: 2 }), undefined);
    });

    it('một phần thành công: đóng hộp, toast nêu số và lỗi đầu tiên', async () => {
        forwardSpy.mockResolvedValue([
            { conversation_id: 45, ok: true },
            { conversation_id: 46, ok: false, code: 'reply_window_closed', error: 'Hội thoại này đã hết thời gian được phép trả lời.' },
        ]);
        const { onClose } = renderDialog();
        await waitFor(() => expect(row(46)).not.toBeNull());
        fireEvent.click(rowCheckbox(45));
        fireEvent.click(rowCheckbox(46));

        await act(async () => submitDialog());

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(alertSpy).toHaveBeenCalledWith(
            t('CONVERSATION.FORWARD.PARTIAL', { ok: 1, total: 2, error: 'Hội thoại này đã hết thời gian được phép trả lời.' }),
        );
    });

    it('tất cả hỏng: giữ hộp mở, giữ lựa chọn, hiện lỗi', async () => {
        forwardSpy.mockResolvedValue([{ conversation_id: 45, ok: false, error: 'Không tìm thấy hội thoại hoặc bạn không có quyền.' }]);
        const { onClose } = renderDialog();
        await waitFor(() => expect(row(45)).not.toBeNull());
        fireEvent.click(rowCheckbox(45));

        await act(async () => submitDialog());

        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toBe(
            t('CONVERSATION.FORWARD.FAILED', { error: 'Không tìm thấy hội thoại hoặc bạn không có quyền.' }),
        );
        expect(rowCheckbox(45).checked).toBe(true);
    });

    it('tin nguồn không chuyển tiếp được: chỉ hiện câu của máy chủ, không có ô tìm và nút xác nhận', async () => {
        fetchTargetsSpy.mockRejectedValue(new ApiError(422, { error: 'Loại tin này chưa chuyển tiếp được.' }));
        renderDialog();

        await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Loại tin này chưa chuyển tiếp được.'));
        expect(screen.queryByRole('searchbox')).toBeNull();
        expect(screen.queryByRole('button', { name: t('CONVERSATION.FORWARD.SUBMIT_COUNT', { count: 0 }) })).toBeNull();
    });

    it('lỗi mạng: báo không tải được và cho thử lại', async () => {
        fetchTargetsSpy.mockRejectedValueOnce(new TypeError('fetch failed'));
        renderDialog();

        await waitFor(() => expect(screen.getByText(t('CONVERSATION.FORWARD.LOAD_FAILED'))).not.toBeNull());
        fireEvent.click(screen.getByRole('button', { name: t('CONVERSATION.FORWARD.RETRY') }));

        await waitFor(() => expect(row(45)).not.toBeNull());
        expect(forwardSpy).not.toHaveBeenCalled();
    });

    it('danh sách rỗng', async () => {
        fetchTargetsSpy.mockResolvedValue({ max_targets: 10, payload: [] });
        renderDialog();

        await waitFor(() => expect(screen.getByText(t('CONVERSATION.FORWARD.EMPTY'))).not.toBeNull());
    });
});
