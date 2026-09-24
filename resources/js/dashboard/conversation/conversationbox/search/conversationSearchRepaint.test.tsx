import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Message from 'dashboard/components-next/message/Message';
import type { ConversationMessage } from 'dashboard/conversation/types';
import { CONVERSATION_SEARCH_HIGHLIGHT, paintConversationSearch } from './conversationSearch';

vi.mock('dashboard/components/widgets/conversation/components/GalleryView', () => ({
    default: () => <div data-testid="gallery" />,
}));

class FakeHighlight {
    readonly ranges: Range[];

    constructor(...ranges: Range[]) {
        this.ranges = ranges;
    }
}

const highlights = new Map<string, FakeHighlight>();

function incomingMessage(overrides: Partial<ConversationMessage> = {}): ConversationMessage {
    return {
        id: 41,
        content: 'Chị gửi em số tài khoản nhé',
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

const paintedText = () => highlights.get(CONVERSATION_SEARCH_HIGHLIGHT)?.ranges.map(range => range.toString());

describe('tô từ khoá tìm trong hội thoại', () => {
    beforeEach(() => {
        highlights.clear();
        vi.stubGlobal('Highlight', FakeHighlight);
        vi.stubGlobal('CSS', { highlights });
    });

    afterEach(() => vi.unstubAllGlobals());

    it('vẫn còn tô khi bong bóng render lại mà nội dung không đổi', () => {
        const view = render(<Message message={incomingMessage()} channelType="Channel::Api" />);
        paintConversationSearch([41], 'tai khoan');
        expect(paintedText()).toEqual(['tài khoản']);

        // Tin nháy nền hay cập nhật trạng thái đều đưa object tin mới xuống bong bóng.
        view.rerender(<Message message={incomingMessage({ status: 'delivered' })} channelType="Channel::Api" />);

        expect(paintedText()).toEqual(['tài khoản']);
    });
});
