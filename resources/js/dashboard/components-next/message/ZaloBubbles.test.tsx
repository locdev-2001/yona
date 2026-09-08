import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setLocale } from '../../../i18n';

import Message from './Message';
import MessagePreview from '../Conversation/ConversationCard/MessagePreview';
import type { ConversationMessage } from 'dashboard/conversation/types';

// Loại tin riêng của Zalo: driver lưu dữ liệu chuẩn hoá ở content_attributes và
// một nhãn đọc được ở content. Bài test khoá cả hai đầu: bong bóng vẽ đúng thẻ,
// và ô xem trước trong danh sách hội thoại không rơi về "Không có nội dung".

const BASE_TIME = 1756707112;

function zaloMessage(contentAttributes: Record<string, unknown>, content: string): ConversationMessage {
    return {
        id: 1,
        content,
        inbox_id: 1,
        conversation_id: 4,
        message_type: 0,
        content_type: 'text',
        status: 'sent',
        content_attributes: contentAttributes,
        created_at: BASE_TIME,
        private: false,
        source_id: 'msg-1',
    } as ConversationMessage;
}

// Locale mặc định của bundle là `en`; hội thoại Zalo thật chạy trên tài khoản vi.
beforeAll(() => setLocale('vi'));
afterAll(() => setLocale('en'));

const renderZalo = (message: ConversationMessage) =>
    render(<Message message={message} channelType="Channel::Zalo" />).container;

describe('bong bóng danh thiếp Zalo', () => {
    const card = {
        business_card: {
            name: 'Nguyễn Phước Lộc',
            title: 'Trưởng phòng kinh doanh',
            thumbnail: 'https://cdn.zalo.test/avatar.jpg',
            url: 'https://www.zaloapp.com',
            phone: '0901234567',
        },
    };

    it('hiện tên, số điện thoại, avatar và nút xem hồ sơ', () => {
        renderZalo(zaloMessage(card, '[Danh thiếp]'));

        expect(screen.getByText('Nguyễn Phước Lộc')).not.toBeNull();
        expect(screen.getByText('0901234567')).not.toBeNull();
        expect(screen.getByTestId('zalo-business-card-avatar').getAttribute('src')).toBe(
            'https://cdn.zalo.test/avatar.jpg',
        );
        expect(screen.getByText('Xem hồ sơ').getAttribute('href')).toBe('https://www.zaloapp.com');
    });

    it('không rơi về bong bóng chữ (nhãn [Danh thiếp] không hiện thô)', () => {
        const container = renderZalo(zaloMessage(card, '[Danh thiếp]'));

        expect(container.querySelector('[data-bubble-name="attachment"]')).not.toBeNull();
        expect(container.textContent).not.toContain('[Danh thiếp]');
    });

    it('vẫn vẽ thẻ khi thiếu tên và không có nội dung', () => {
        const container = renderZalo(zaloMessage({ business_card: { url: null } }, ''));

        expect(container.querySelector('[data-bubble-name="attachment"]')).not.toBeNull();
        expect(screen.getByText('Danh thiếp')).not.toBeNull();
    });
});

describe('bong bóng xem trước liên kết', () => {
    // Tin 951 (08/09/2026): khách gửi link ảnh QR chuyển khoản. Zalo dùng chung
    // msgType với danh thiếp nên trước đây UI hiện "đã gửi một danh thiếp
    // https://…" — URL thô đứng làm tên người.
    const preview = {
        link_preview: {
            url: 'https://qr.thanhtoan.test/img?bank=Ngan+Hang+Test&acc=100000000000',
            image: 'https://cdn.zalo.test/photolink/zlv-test',
            source: 'qr.thanhtoan.test',
        },
    };

    it('hiện ảnh xem trước, tên miền và URL rút gọn, mở tab mới an toàn', () => {
        const container = renderZalo(zaloMessage(preview, preview.link_preview.url));
        const card = screen.getByTestId('link-preview-card');

        expect(card.getAttribute('href')).toBe(preview.link_preview.url);
        expect(card.getAttribute('target')).toBe('_blank');
        expect(card.getAttribute('rel')).toContain('noopener');
        expect(card.getAttribute('rel')).toContain('noreferrer');
        expect(screen.getByTestId('link-preview-image').getAttribute('src')).toBe(preview.link_preview.image);
        expect(container.textContent).toContain('qr.thanhtoan.test');
        expect(container.textContent).not.toContain('danh thiếp');
    });

    it('dùng tiêu đề và mô tả khi kênh gửi kèm, giữ chú thích khách gõ', () => {
        renderZalo(
            zaloMessage(
                {
                    link_preview: {
                        url: 'https://tin-tuc.test/bai-viet',
                        title: 'Bảng giá Yona',
                        description: 'Gói Team 299k/tháng',
                    },
                },
                'Anh xem giúp em',
            ),
        );

        expect(screen.getByText('Bảng giá Yona')).not.toBeNull();
        expect(screen.getByText('Gói Team 299k/tháng')).not.toBeNull();
        expect(screen.getByText('Anh xem giúp em')).not.toBeNull();
    });

    it('không rơi về bong bóng danh thiếp', () => {
        const container = renderZalo(zaloMessage(preview, preview.link_preview.url));

        expect(container.querySelector('[data-bubble-name="link-preview"]')).not.toBeNull();
        expect(container.querySelector('[data-bubble-name="attachment"]')).toBeNull();
    });
});

describe('bong bóng thẻ ngân hàng Zalo', () => {
    const card = {
        bank_card: {
            bank_name: 'Vietcombank',
            account_number: '1027123456',
            account_holder: 'NGUYEN PHUOC LOC',
            qr_url: 'https://cdn.zalo.test/qr.png',
        },
    };

    it('hiện ngân hàng, số tài khoản, chủ tài khoản, QR và nút sao chép', () => {
        renderZalo(zaloMessage(card, '[Tài khoản ngân hàng]'));

        expect(screen.getByText('Vietcombank')).not.toBeNull();
        expect(screen.getByText('1027123456')).not.toBeNull();
        expect(screen.getByText('NGUYEN PHUOC LOC')).not.toBeNull();
        expect(screen.getByTestId('zalo-bank-card-qr').getAttribute('src')).toBe('https://cdn.zalo.test/qr.png');
        expect(screen.getByRole('button', { name: 'Sao chép số tài khoản' })).not.toBeNull();
    });

    it('bỏ nút sao chép khi bridge chưa lấy được số tài khoản', () => {
        renderZalo(zaloMessage({ bank_card: { bank_name: 'Vietcombank' } }, '[Tài khoản ngân hàng]'));

        expect(screen.queryByRole('button', { name: 'Sao chép số tài khoản' })).toBeNull();
    });
});

describe('bong bóng nhắc hẹn Zalo', () => {
    it('hiện tiêu đề kèm emoji và thời điểm, không hiện link ảnh thô', () => {
        const container = renderZalo(
            zaloMessage(
                {
                    reminder: {
                        title: 'Hẹn gọi tư vấn gói Team',
                        description: 'Thứ Hai, 7 tháng 9 lúc 00:49',
                        emoji: '⏰',
                        start_time: 1788716940000,
                    },
                },
                'Hẹn gọi tư vấn gói Team',
            ),
        );

        expect(screen.getByText('⏰ Hẹn gọi tư vấn gói Team')).not.toBeNull();
        expect(screen.getByText('Thứ Hai, 7 tháng 9 lúc 00:49')).not.toBeNull();
        expect(container.textContent).not.toContain('https://');
    });
});

describe('bong bóng cuộc gọi Zalo', () => {
    it('gọi nhỡ hiện "nhỡ"', () => {
        renderZalo(zaloMessage({ call: { media: 'voice', outcome: 'missed', duration_seconds: 0 } }, '[Cuộc gọi]'));

        expect(screen.getByText('Cuộc gọi thoại · nhỡ')).not.toBeNull();
    });

    it('gọi video xong hiện thời lượng', () => {
        renderZalo(
            zaloMessage({ call: { media: 'video', outcome: 'completed', duration_seconds: 125 } }, '[Cuộc gọi]'),
        );

        expect(screen.getByText('Cuộc gọi video · 2:05')).not.toBeNull();
    });
});

// MỞ RỘNG NGOÀI GỐC: Chatwoot v4.17.1 không vẽ biểu cảm. Hàng emoji mang
// `data-yona-reactions` để pixel-diff loại trừ được.
describe('hàng biểu cảm dưới bong bóng', () => {
    it('vẽ emoji đã lưu ở content_attributes.reactions', () => {
        const container = renderZalo(zaloMessage({ reactions: ['👍', '❤️'] }, 'Xin chào'));
        const row = container.querySelector('[data-yona-reactions]');

        expect(row).not.toBeNull();
        expect(row?.textContent).toBe('👍❤️');
    });

    it('không chèn gì khi tin chưa có biểu cảm', () => {
        const container = renderZalo(zaloMessage({}, 'Xin chào'));

        expect(container.querySelector('[data-yona-reactions]')).toBeNull();
    });
});

describe('ô xem trước trong danh sách hội thoại', () => {
    it.each([
        ['[Danh thiếp]', { business_card: { name: 'A' } }],
        ['[Tài khoản ngân hàng]', { bank_card: { account_number: '1' } }],
        ['[Cuộc gọi]', { call: { outcome: 'missed' } }],
        ['Hẹn gọi tư vấn gói Team', { reminder: { title: 'Hẹn gọi tư vấn gói Team' } }],
        // Thẻ liên kết: nhãn là tiêu đề/URL thật, KHÔNG phải "[Danh thiếp]".
        ['Bảng giá Yona', { link_preview: { url: 'https://tin-tuc.test/x', title: 'Bảng giá Yona' } }],
    ])('hiện nhãn "%s" thay vì "Không có nội dung"', (label, contentAttributes) => {
        const container = render(<MessagePreview message={zaloMessage(contentAttributes, label)} />).container;

        expect(container.textContent).toContain(label);
        expect(container.textContent).not.toContain('Không có nội dung');
    });
});
