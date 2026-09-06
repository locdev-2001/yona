import { render, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import IfSupports from 'shared/components/IfSupports';

import { inboxSupports, useInboxCapabilities } from './useInboxCapabilities';

const zaloInbox = { capabilities: ['inbound_text', 'outbound_reply_to', 'event_seen'] };

describe('useInboxCapabilities', () => {
    it('trả đúng năng lực kênh khai báo và chỉ năng lực đó', () => {
        const { result } = renderHook(() => useInboxCapabilities(zaloInbox));

        expect(result.current.supports('outbound_reply_to')).toBe(true);
        expect(result.current.supports('outbound_reaction')).toBe(false);
        expect(result.current.supportsAny('outbound_reaction', 'event_seen')).toBe(true);
    });

    it('kênh chưa khai báo thì coi như không hỗ trợ gì', () => {
        const { result } = renderHook(() => useInboxCapabilities(null));

        expect(result.current.capabilities).toEqual([]);
        expect(result.current.supports('inbound_text')).toBe(false);
        expect(inboxSupports(undefined, 'inbound_text')).toBe(false);
        expect(inboxSupports({}, 'inbound_text')).toBe(false);
    });
});

describe('IfSupports', () => {
    it('chỉ hiện khi kênh hỗ trợ ĐỦ các năng lực yêu cầu', () => {
        const { container } = render(
            <>
                <IfSupports inbox={zaloInbox} cap="outbound_reply_to">
                    <span data-testid="reply" />
                </IfSupports>
                <IfSupports inbox={zaloInbox} cap={['outbound_reply_to', 'outbound_reaction']}>
                    <span data-testid="reaction" />
                </IfSupports>
            </>,
        );

        expect(container.querySelector('[data-testid="reply"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="reaction"]')).toBeNull();
    });
});
