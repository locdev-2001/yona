import { describe, expect, it } from 'vitest';

import { buildOutgoingContentAttributes } from './outgoingContentAttributes';

describe('buildOutgoingContentAttributes', () => {
    it('không có gì để gửi kèm thì trả undefined', () => {
        expect(buildOutgoingContentAttributes({})).toBeUndefined();
        expect(buildOutgoingContentAttributes({ inReplyTo: null })).toBeUndefined();
        expect(buildOutgoingContentAttributes({ inReplyTo: -4 })).toBeUndefined();
    });

    it('trả lời một tin → in_reply_to', () => {
        expect(buildOutgoingContentAttributes({ inReplyTo: 1234 })).toEqual({ in_reply_to: 1234 });
    });
});
