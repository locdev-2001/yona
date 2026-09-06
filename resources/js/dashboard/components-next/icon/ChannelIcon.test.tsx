import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ChannelIcon from './ChannelIcon';
import { INBOX_TYPES, getInboxIconByType } from 'dashboard/helper/inbox';

// Nhận diện kênh (UX #1 của reports/ux-zalo-main-session-notes.md): thẻ hội
// thoại, header hội thoại và sidebar Kênh phải dùng CHUNG một bảng icon.
describe('icon kênh', () => {
    it('Zalo có nhãn riêng chứ không rơi về icon chat/quả cầu chung', () => {
        expect(getInboxIconByType(INBOX_TYPES.ZALO)).toBe('i-woot-zalo');
        expect(getInboxIconByType(INBOX_TYPES.ZALO, 'fill')).toBe('i-woot-zalo');
    });

    it('ChannelIcon đọc cùng bảng với thẻ hội thoại', () => {
        const { container } = render(<ChannelIcon inbox={{ channel_type: INBOX_TYPES.ZALO }} />);

        expect(container.querySelector('.i-woot-zalo')).not.toBeNull();
    });

    it('giữ nguyên icon của các kênh đã port', () => {
        expect(getInboxIconByType(INBOX_TYPES.TELEGRAM)).toBe('i-woot-telegram');
        expect(getInboxIconByType(INBOX_TYPES.WEB)).toBe('i-woot-website');
    });

    it('kênh lạ vẫn dùng icon dự phòng cũ của ChannelIcon', () => {
        const { container } = render(<ChannelIcon inbox={{ channel_type: 'Channel::Unknown' }} />);

        expect(container.querySelector('.i-ri-global-fill')).not.toBeNull();
    });

    it('tên inbox làm tooltip', () => {
        const { container } = render(
            <ChannelIcon inbox={{ channel_type: INBOX_TYPES.ZALO, name: 'Zalo shop chính' }} />,
        );

        expect(container.querySelector('span')?.getAttribute('title')).toBe('Zalo shop chính');
    });
});
