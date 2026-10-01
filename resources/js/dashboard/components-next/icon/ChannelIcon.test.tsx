import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ChannelIcon from './ChannelIcon';
import { INBOX_TYPES, getInboxIconByType } from 'dashboard/helper/inbox';

// Nhận diện kênh (UX #1 của reports/ux-zalo-main-session-notes.md): thẻ hội
// thoại, header hội thoại và sidebar Kênh phải dùng CHUNG một bảng icon.
describe('icon kênh', () => {
    it('Zalo có nhãn riêng chứ không rơi về icon chat/quả cầu chung', () => {
        expect(getInboxIconByType(INBOX_TYPES.ZALO)).toBe('i-yona-zalo');
        expect(getInboxIconByType(INBOX_TYPES.ZALO, 'fill')).toBe('i-yona-zalo');
    });

    it('ChannelIcon đọc cùng bảng với thẻ hội thoại', () => {
        const { container } = render(<ChannelIcon inbox={{ channel_type: INBOX_TYPES.ZALO }} />);

        expect(container.querySelector('.i-yona-zalo')).not.toBeNull();
    });

    it('giữ nguyên icon của các kênh đã port', () => {
        expect(getInboxIconByType(INBOX_TYPES.TELEGRAM)).toBe('i-yona-telegram');
        expect(getInboxIconByType(INBOX_TYPES.WEB)).toBe('i-lucide-globe');
    });

    it('kênh lạ vẫn dùng icon dự phòng cũ của ChannelIcon', () => {
        const { container } = render(<ChannelIcon inbox={{ channel_type: 'Channel::Unknown' }} />);

        expect(container.querySelector('.i-lucide-globe')).not.toBeNull();
    });

    it('tên inbox làm tooltip', () => {
        const { container } = render(
            <ChannelIcon inbox={{ channel_type: INBOX_TYPES.ZALO, name: 'Zalo shop chính' }} />,
        );

        expect(container.querySelector('span')?.getAttribute('title')).toBe('Zalo shop chính');
    });

    describe('hộp thư mang nền tảng do kênh tự khai', () => {
        const zaloInbox = {
            channel_type: INBOX_TYPES.ZALO,
            name: 'Zalo shop chính',
            platform: { key: 'zalo', name: 'Zalo', logo_url: '/brand-assets/platforms/zalo.svg' },
        };

        it('vẽ logo màu của nền tảng thay icon đơn sắc', () => {
            const { container } = render(<ChannelIcon inbox={zaloInbox} />);

            expect(container.querySelector('img[data-platform="zalo"]')?.getAttribute('src')).toBe(
                '/brand-assets/platforms/zalo.svg',
            );
            expect(container.querySelector('.i-yona-zalo')).toBeNull();
        });

        it('vẫn lấy tên hộp thư làm tooltip', () => {
            const { container } = render(<ChannelIcon inbox={zaloInbox} />);

            expect(container.querySelector('span')?.getAttribute('title')).toBe('Zalo shop chính');
            expect(container.querySelector('img')?.hasAttribute('title')).toBe(false);
        });
    });
});
