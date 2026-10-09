import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Message from './Message';
import type { ConversationMessage } from 'dashboard/conversation/types';

// Mọi liên kết trong tin mở tab mới, không cho trang đích chạm ngược vào hộp thư.
function message(overrides: Partial<ConversationMessage> = {}): ConversationMessage {
    return {
        id: 1,
        content: 'Xem https://shop.vn/sp-1 nhé',
        inbox_id: 1,
        conversation_id: 4,
        message_type: 0,
        content_type: 'text',
        status: 'sent',
        content_attributes: {},
        created_at: 1756707112,
        private: false,
        source_id: null,
        ...overrides,
    };
}

function expectAllLinksOpenInNewTab(anchors: Iterable<Element>) {
    const list = Array.from(anchors);

    expect(list.length).toBeGreaterThan(0);
    list.forEach(anchor => {
        expect(anchor.getAttribute('target')).toBe('_blank');
        expect(anchor.getAttribute('rel')).toContain('noopener');
        expect(anchor.getAttribute('rel')).toContain('noreferrer');
    });
}

const linksIn = (payload: ConversationMessage, channelType = 'Channel::Api') =>
    render(<Message message={payload} channelType={channelType} />).container.querySelectorAll('a[href]');

describe('liên kết trong tin mở tab mới', () => {
    it('bong bóng chữ của khách', () => {
        expectAllLinksOpenInNewTab(linksIn(message()));
    });

    it('bong bóng chữ markdown của nhân viên', () => {
        expectAllLinksOpenInNewTab(linksIn(message({ message_type: 1, content: '[Bảng giá](https://shop.vn/bang-gia)' })));
    });

    it('ghi chú riêng', () => {
        expectAllLinksOpenInNewTab(linksIn(message({ message_type: 1, private: true })));
    });

    it('thẻ xem trước liên kết', () => {
        expectAllLinksOpenInNewTab(
            linksIn(
                message({
                    content: 'https://shop.vn/sp-1',
                    content_attributes: { link_preview: { url: 'https://shop.vn/sp-1', title: 'Sản phẩm 1' } },
                }),
            ),
        );
    });

    it('thư HTML trong khung đọc thư', () => {
        const container = render(
            <Message
                message={message({
                    content: 'Chào đơn hàng',
                    content_attributes: {
                        email: { html_content: { full: '<p>Chào <a href="https://shop.vn/don">đơn hàng</a></p>' } },
                    },
                })}
                channelType="Channel::Email"
            />,
        ).container;
        const frameDocument = container.querySelector('iframe[data-testid="email-html-body"]')?.getAttribute('srcdoc') ?? '';
        const parsed = new DOMParser().parseFromString(frameDocument, 'text/html');

        expectAllLinksOpenInNewTab(parsed.body.querySelectorAll('a[href]'));
    });
});
