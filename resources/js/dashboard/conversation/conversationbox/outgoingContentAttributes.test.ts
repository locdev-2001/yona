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

describe('buildOutgoingContentAttributes với nhắc tên', () => {
    const mention = { external_id: '555', name: 'Bình', offset: 0, length: 5 };

    it('danh sách rỗng thì không có khoá mentions', () => {
        expect(buildOutgoingContentAttributes({ mentions: [] })).toBeUndefined();
    });

    it('vừa trả lời trích dẫn vừa nhắc tên → cả hai khoá trong một object', () => {
        expect(buildOutgoingContentAttributes({ inReplyTo: 7, mentions: [mention] })).toEqual({
            in_reply_to: 7,
            mentions: [mention],
        });
    });
});
