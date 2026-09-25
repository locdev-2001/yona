import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setLocale } from '../../i18n';
import {
    MessageHostProvider,
    resolveStructured,
    StructuredMessageView,
    type MessageHost,
    type StructuredMessage,
} from './index';
import { defineMessageType, registerMessageTypes } from './registry';

// Contract dùng chung với server: mỗi fixture ở tests/Contracts/Messaging mô tả
// payload đã chuẩn hoá; kit phải đọc được và vẽ ra đúng nội dung chính.
const fixtures = import.meta.glob('../../../../tests/Contracts/Messaging/fixtures/*.json', { eager: true, import: 'default' }) as Record<
    string,
    { content_type: string; valid: { name: string; content: string | null; normalized: Record<string, unknown> }[] }
>;

const messageOf = (contentType: string, attributes: Record<string, unknown>, content: string | null = null, extra: Partial<StructuredMessage> = {}): StructuredMessage => ({
    id: 1,
    content,
    content_type: contentType,
    content_attributes: attributes,
    message_type: 1,
    ...extra,
});

function renderMessage(message: StructuredMessage, host: Partial<MessageHost> = {}) {
    const resolved = resolveStructured(message);
    if (!resolved) throw new Error(`${message.content_type} không resolve được`);

    const fullHost: MessageHost = { surface: 'widget', interactive: true, submit: vi.fn(() => Promise.resolve()), act: vi.fn(), ...host };

    return {
        host: fullHost,
        ...render(
            <MessageHostProvider host={fullHost}>
                <StructuredMessageView resolved={resolved} message={message} />
            </MessageHostProvider>,
        ),
    };
}

beforeEach(() => setLocale('vi'));

describe('contract với server', () => {
    it('có fixture', () => {
        expect(Object.keys(fixtures).length).toBeGreaterThanOrEqual(7);
    });

    for (const fixture of Object.values(fixtures)) {
        for (const testCase of fixture.valid) {
            it(`${fixture.content_type}: ${testCase.name}`, () => {
                const { container } = renderMessage(messageOf(fixture.content_type, testCase.normalized, testCase.content));

                expect(container.querySelector('.mk')).not.toBeNull();
            });
        }
    }

    it('payload đời cũ sai hình dạng thì không resolve, host vẽ chữ', () => {
        expect(resolveStructured(messageOf('input_select', { items: 'x' }))).toBeNull();
        expect(resolveStructured(messageOf('cards', { items: [{ description: 'không có tên' }] }))).toBeNull();
        expect(resolveStructured(messageOf('text', { anything: true }))).toBeNull();
    });
});

describe('thẻ sản phẩm', () => {
    const card = {
        id: 'binh-lam-40',
        title: 'Bình men lam 40cm',
        price: { amount: 1250000, currency: 'VND', compare_at: 1490000, discount_percent: 16 },
        stock_label: 'Còn 2 cái',
        actions: [
            { kind: 'link', label: 'Chi tiết', url: 'https://gommoc.vn/binh-lam' },
            { kind: 'order', label: 'Đặt mua' },
        ],
    };

    it('giá bán một dòng; giá cũ gạch + nhãn giảm ở dòng dưới', () => {
        const { container } = renderMessage(messageOf('cards', { items: [card] }));

        expect(container.querySelector('.mk-price-now')).toHaveTextContent('1.250.000đ');
        expect(container.querySelector('.mk-price-old')).toHaveTextContent('1.490.000đ');
        expect(container.querySelector('.mk-sale')).toHaveTextContent('-16%');
    });

    it('không giảm thì không có dòng giá cũ', () => {
        const { container } = renderMessage(messageOf('cards', { items: [{ ...card, price: { amount: 180000, currency: 'VND' } }] }));

        expect(container.querySelector('.mk-price-was')).toBeNull();
    });

    it('Đặt mua là nút chính và giao host mở sheet kèm mã sản phẩm', () => {
        const { host } = renderMessage(messageOf('cards', { items: [card] }));
        const order = screen.getByRole('button', { name: 'Đặt mua' });

        expect(order).toHaveClass('mk-pill--primary');
        fireEvent.click(order);
        expect(host.act).toHaveBeenCalledWith(expect.objectContaining({ kind: 'order' }), expect.objectContaining({ itemId: 'binh-lam-40' }));
    });

    it('nhiều thẻ thành băng trượt ngang có chấm vị trí và nút trước/sau', () => {
        renderMessage(messageOf('cards', { items: [card, { ...card, id: 'b' }, { ...card, id: 'c' }] }));

        expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Sản phẩm 1 trên 3');
        expect(screen.getByRole('button', { name: 'Sản phẩm trước' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Sản phẩm sau' })).toBeEnabled();
    });

    it('link javascript: trong tin cũ bị bỏ, không vẽ thành nút', () => {
        renderMessage(messageOf('cards', { items: [{ ...card, actions: [{ kind: 'link', label: 'X', url: 'javascript:alert(1)' }] }] }));

        expect(screen.queryByRole('link', { name: 'X' })).toBeNull();
    });
});

describe('trả lời nhanh', () => {
    const question = messageOf('input_select', { items: [{ title: 'Giờ hành chính', value: 'office' }, { title: 'Buổi tối', value: 'evening' }] }, 'Khi nào ạ?');

    it('bấm chip gửi câu trả lời, hiện ngay lựa chọn và khoá chip còn lại', async () => {
        let resolve!: () => void;
        const submit = vi.fn(() => new Promise<void>(done => (resolve = done)));
        renderMessage(question, { submit });

        fireEvent.click(screen.getByRole('button', { name: 'Buổi tối' }));

        expect(submit).toHaveBeenCalledWith(question, [{ title: 'Buổi tối', value: 'evening' }]);
        expect(screen.getByRole('button', { name: 'Buổi tối' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Giờ hành chính' })).toBeDisabled();
        await act(async () => resolve());
    });

    it('gửi lỗi thì hoàn tác và báo lỗi', async () => {
        renderMessage(question, { submit: () => Promise.reject(new Error('422')) });

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Buổi tối' }));
        });

        expect(screen.getByRole('button', { name: 'Buổi tối' })).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByText('Chưa gửi được, thử lại nhé')).toBeInTheDocument();
    });

    it('widget: đã trả lời thì chip biến mất (câu trả lời là tin của khách)', () => {
        const { container } = renderMessage({ ...question, content_attributes: { ...question.content_attributes, submitted_values: [{ title: 'Buổi tối', value: 'evening' }] } });

        expect(container.querySelector('.mk-chip')).toBeNull();
    });

    it('hộp thư: chỉ xem, và thấy khách đã chọn gì', () => {
        renderMessage(
            { ...question, content_attributes: { ...question.content_attributes, submitted_values: [{ title: 'Buổi tối', value: 'evening' }] } },
            { surface: 'dashboard', interactive: false },
        );

        expect(screen.getByText('Khách đã chọn: Buổi tối')).toBeInTheDocument();
    });
});

describe('form trong tin', () => {
    const form = messageOf('form', { items: [{ name: 'phone', type: 'phone', label: 'Số điện thoại', required: true }] }, 'Để lại số, shop gọi lại');

    it('kiểm số điện thoại trước khi gửi', () => {
        const { host } = renderMessage(form);

        fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: 'abc' } });
        fireEvent.click(screen.getByRole('button', { name: 'Gửi số điện thoại' }));
        expect(host.submit).not.toHaveBeenCalled();
        expect(screen.getByText('Kiểm tra lại Số điện thoại')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '0912 345 678' } });
        fireEvent.click(screen.getByRole('button', { name: 'Gửi số điện thoại' }));
        expect(host.submit).toHaveBeenCalledWith(form, [{ name: 'phone', value: '0912 345 678' }]);
    });

    it('form dài chỉ có nút mở trang', () => {
        const { host } = renderMessage(
            messageOf('form', { items: [1, 2, 3, 4].map(n => ({ name: `f${n}`, type: 'text', label: `Ô ${n}` })) }, 'Thông tin giao hàng'),
        );

        fireEvent.click(screen.getByRole('button', { name: 'Điền thông tin' }));
        expect(host.act).toHaveBeenCalledWith(expect.objectContaining({ kind: 'webview', page: 'form' }), expect.anything());
    });

    it('đã gửi thì thành bản tóm tắt', () => {
        renderMessage({ ...form, content_attributes: { ...form.content_attributes, submitted_values: [{ name: 'phone', title: 'Số điện thoại', value: '0912 345 678' }] } });

        expect(screen.getByText('Đã nhận thông tin')).toBeInTheDocument();
        expect(screen.getByText('0912 345 678')).toBeInTheDocument();
    });
});

describe('mở trang công khai (webview)', () => {
    it('xem trước khung giờ: bỏ khung đã hết chỗ, chỉ hiện nhãn của khung còn trống', () => {
        const { container } = renderMessage(
            messageOf('webview', {
                page: 'schedule',
                title: 'Chọn lịch nhận',
                data: {
                    slots: [
                        { date: '2026-09-27', label: 'T7 · 8–10h', value: 't7-am', full: true },
                        { date: '2026-09-27', label: 'T7 · 14–16h', value: 't7-pm' },
                        { date: '2026-09-28', label: 'CN · 8–10h', value: 'cn-am' },
                    ],
                },
            }),
        );

        expect(screen.queryByText('T7 · 8–10h')).not.toBeInTheDocument();
        expect(screen.getByText('T7 · 14–16h')).toBeInTheDocument();
        // 2 khung còn trống vừa đủ PREVIEW_SLOTS, không hiện nhãn "+n" thừa.
        expect(container.querySelector('.mk-slot--more')).toBeNull();
    });
});

describe('đơn hàng và yêu cầu đặt hàng', () => {
    it('trạng thái đơn: thanh tiến độ đánh dấu đoạn đang giao', () => {
        const { container } = renderMessage(
            messageOf('order_status', { order_ref: 'GM1024', status: 'delivering', eta: '2026-09-27', total: { amount: 480000, currency: 'VND' }, fee_included: true }),
        );

        expect(container.querySelector('.mk-order-head')).toHaveTextContent('Đang giao');
        expect(screen.getByText('Dự kiến nhận 27/09')).toBeInTheDocument();
        expect(container.querySelectorAll('.mk-step[data-state="done"]')).toHaveLength(2);
        expect(container.querySelector('.mk-step[data-state="current"]')).not.toBeNull();
    });

    it('yêu cầu đặt hàng nằm phía khách', () => {
        const message = messageOf('order_request', { title: 'Bình men lam 40cm', selection_label: 'Lam', quantity: 2, total: { amount: 2500000, currency: 'VND' } }, null, { message_type: 0 });

        expect(resolveStructured(message)?.definition.side).toBe('contact');
        renderMessage(message);
        expect(screen.getByText('Lam · × 2')).toBeInTheDocument();
        expect(screen.getByText('2.500.000đ')).toBeInTheDocument();
    });
});

it('thêm một loại tin mới không cần sửa kit', () => {
    registerMessageTypes([
        defineMessageType<string[]>({
            contentType: 'poll_demo',
            content: 'host',
            side: 'agent',
            parse: attributes => (Array.isArray(attributes.options) ? (attributes.options as string[]) : null),
            View: ({ model }) => <ul>{model.map(option => <li key={option}>{option}</li>)}</ul>,
        }),
    ] as never[]);

    renderMessage(messageOf('poll_demo', { options: ['Có', 'Không'] }));
    expect(screen.getByText('Có')).toBeInTheDocument();
});
