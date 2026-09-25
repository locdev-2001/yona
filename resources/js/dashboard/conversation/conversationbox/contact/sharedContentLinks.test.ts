import { describe, expect, it } from 'vitest';

import { linksOfMessages } from './sharedContentLinks';

describe('linksOfMessages', () => {
    it('lists every link of each message with its domain, keeping message order', () => {
        const links = linksOfMessages([
            { message_id: 9, content: 'Đơn: https://www.shop.vn/don/1 và yona.vn/gia', created_at: 200 },
            { message_id: 4, content: 'không có liên kết https://', created_at: 100 },
        ]);

        expect(links.map(link => [link.messageId, link.domain, link.url])).toEqual([
            [9, 'shop.vn', 'https://www.shop.vn/don/1'],
            [9, 'yona.vn', 'http://yona.vn/gia'],
        ]);
    });
});
