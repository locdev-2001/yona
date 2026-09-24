import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { setLocale } from '../../../../i18n';
import ConversationCard from './ConversationCard';
import type { Conversation } from 'dashboard/conversation/types';

vi.mock('@inertiajs/react', () => ({ router: { visit: vi.fn() } }));

describe('thẻ hội thoại trong lịch sử liên hệ', () => {
    afterEach(() => setLocale('en'));

    it('mốc thời gian tiếng Việt không bị ép xuống dòng cạnh tên dài', () => {
        setLocale('vi');
        const conversation = {
            id: 7,
            inbox_id: 1,
            priority: null,
            labels: [],
            messages: [],
            timestamp: Math.floor(Date.now() / 1000) - 5,
        } as unknown as Conversation;

        const { getByText } = render(
            <ConversationCard
                conversation={conversation}
                contact={{ id: 3, name: 'Nguyễn Thị Thanh Hương Khách Hàng Rất Dài Tên' }}
                accountLabels={[]}
                accountId={2}
            />,
        );

        expect(getByText('vừa xong').parentElement?.className).toContain('flex-shrink-0');
    });
});
