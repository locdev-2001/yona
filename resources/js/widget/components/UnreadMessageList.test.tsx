import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import UnreadMessageList from './UnreadMessageList';

describe('lời mời có chip trả lời nhanh', () => {
    it('hiện chip dưới bong bóng mời; bấm thì báo đúng chữ của chip', () => {
        const onQuickReply = vi.fn();
        render(
            <UnreadMessageList
                messages={[{ content: 'Shop đang online nè', campaignId: 4 }]}
                unreadMessageCount={0}
                quickReplies={['Còn hàng không?', 'Phí ship?']}
                onQuickReply={onQuickReply}
                onClose={() => undefined}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Phí ship?' }));
        expect(onQuickReply).toHaveBeenCalledWith('Phí ship?');
    });
});
