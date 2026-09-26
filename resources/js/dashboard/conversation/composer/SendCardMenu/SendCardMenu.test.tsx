import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { t } from '../../../../i18n';

// jsdom: Popover/CardPreview đo kích thước bằng ResizeObserver; <dialog> chưa có showModal thật.
class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}

const { createCannedResponse } = vi.hoisted(() => ({ createCannedResponse: vi.fn() }));
vi.mock('dashboard/composables/useCannedResponses', () => ({
    createCannedResponse,
    isShortCodeInvalid: (shortCode: string) => shortCode.trim().length < 2,
}));

import SendCardMenu from './SendCardMenu';
import type { CannedCardPayload } from './SendCardMenu';

const k = (key: string, values?: Record<string, string | number>) => t(`CONVERSATION.SEND_CARD.${key}`, values);

beforeAll(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    HTMLDialogElement.prototype.showModal = function showModal() {
        this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function close() {
        this.removeAttribute('open');
    };
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('SendCardMenu — Lưu làm câu trả lời mẫu', () => {
    it('lưu đúng thẻ đang soạn kèm mã tắt đã gõ, không gửi tin', () => {
        createCannedResponse.mockResolvedValue({ id: 1, short_code: 'hoi-gio', content: 'Bạn muốn nhận hàng khi nào ạ?' });
        const onSend = vi.fn();

        render(<SendCardMenu accountId={5} conversationDisplayId={42} onSend={onSend} />);

        fireEvent.click(screen.getByTitle(k('BUTTON')));
        fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(k('QUICK_REPLIES.TITLE')) }));

        fireEvent.change(screen.getByLabelText(k('QUICK_REPLIES.QUESTION')), { target: { value: 'Bạn muốn nhận hàng khi nào ạ?' } });
        fireEvent.change(screen.getByLabelText(k('QUICK_REPLIES.OPTION', { index: 1 })), { target: { value: 'Sáng' } });
        fireEvent.change(screen.getByLabelText(k('QUICK_REPLIES.OPTION', { index: 2 })), { target: { value: 'Tối' } });

        fireEvent.change(screen.getByLabelText(k('SAVE_AS_CANNED_LABEL')), { target: { value: 'hoi-gio' } });
        fireEvent.click(screen.getByRole('button', { name: k('SAVE_AS_CANNED') }));

        expect(createCannedResponse).toHaveBeenCalledWith(5, {
            short_code: 'hoi-gio',
            content: 'Bạn muốn nhận hàng khi nào ạ?',
            content_type: 'input_select',
            content_attributes: { items: [{ title: 'Sáng', value: 'Sáng' }, { title: 'Tối', value: 'Tối' }] },
        });
        // Lưu làm mẫu không gửi tin, dialog vẫn còn để nhân viên tự bấm Gửi nếu muốn.
        expect(onSend).not.toHaveBeenCalled();
    });

    it('vô hiệu hoá nút lưu khi chưa gõ đủ mã tắt', () => {
        render(<SendCardMenu accountId={5} conversationDisplayId={42} onSend={vi.fn()} />);

        fireEvent.click(screen.getByTitle(k('BUTTON')));
        fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(k('QUICK_REPLIES.TITLE')) }));
        fireEvent.change(screen.getByLabelText(k('QUICK_REPLIES.QUESTION')), { target: { value: 'Hỏi gì đó?' } });
        fireEvent.change(screen.getByLabelText(k('QUICK_REPLIES.OPTION', { index: 1 })), { target: { value: 'Có' } });
        fireEvent.change(screen.getByLabelText(k('QUICK_REPLIES.OPTION', { index: 2 })), { target: { value: 'Không' } });

        const saveButton = screen.getByRole('button', { name: k('SAVE_AS_CANNED') });
        expect(saveButton).toBeDisabled();

        fireEvent.click(saveButton);

        expect(createCannedResponse).not.toHaveBeenCalled();
    });
});

describe('SendCardMenu — chọn câu trả lời mẫu có thẻ trong hộp thư', () => {
    const cannedCard: CannedCardPayload = {
        contentType: 'input_select',
        content: 'Bạn muốn nhận hàng khi nào ạ?',
        contentAttributes: { items: [{ title: 'Sáng', value: 'Sáng' }, { title: 'Tối', value: 'Tối' }] },
    };

    it('mở sẵn hộp thoại Gửi thẻ, điền đúng thẻ đã lưu để xem trước', () => {
        render(<SendCardMenu accountId={5} conversationDisplayId={42} onSend={vi.fn()} cannedCard={cannedCard} onCannedCardConsumed={vi.fn()} />);

        expect(document.querySelector('dialog')).toHaveAttribute('open');
        expect(screen.getByText(k('REVIEW_TITLE'))).toBeInTheDocument();
        expect(screen.getByText('Bạn muốn nhận hàng khi nào ạ?')).toBeInTheDocument();
        expect(screen.getByText('Sáng')).toBeInTheDocument();
        expect(screen.getByText('Tối')).toBeInTheDocument();
    });

    it('bấm Gửi thì gửi đúng thẻ đã lưu và báo đã dùng xong', () => {
        const onSend = vi.fn();
        const onCannedCardConsumed = vi.fn();
        render(
            <SendCardMenu
                accountId={5}
                conversationDisplayId={42}
                onSend={onSend}
                cannedCard={cannedCard}
                onCannedCardConsumed={onCannedCardConsumed}
            />,
        );

        fireEvent.submit(document.querySelector('dialog form') as HTMLFormElement);

        expect(onSend).toHaveBeenCalledWith({
            contentType: 'input_select',
            content: 'Bạn muốn nhận hàng khi nào ạ?',
            contentAttributes: cannedCard.contentAttributes,
        });
        expect(onCannedCardConsumed).toHaveBeenCalled();
    });
});
